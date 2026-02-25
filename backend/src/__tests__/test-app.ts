/**
 * Creates an Express app wired to the in-memory test database.
 * The authenticateToken middleware is replaced by one that reads
 * a simple JWT signed with a symmetric test secret.
 */
import express from 'express';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import { Database } from 'sqlite';
import crypto from 'crypto';

const TEST_SECRET = 'test-secret-key-do-not-use-in-prod';

/**
 * Build a standalone Express app for testing.
 * We dynamically import route files after patching `getDB` and `authenticateToken`.
 */
export function buildTestApp(db: Database) {
  const app = express();
  app.use(bodyParser.json());

  // Middleware: verify symmetric JWT for tests
  const testAuth: express.RequestHandler = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Missing token' });
      return;
    }
    try {
      const payload = jwt.verify(token, TEST_SECRET);
      (req as any).user = payload;
      next();
    } catch {
      res.status(403).json({ error: 'Invalid or expired token' });
    }
  };

  // ── Planning routes (inline, using test db) ──────────
  const planningRouter = express.Router();
  planningRouter.use(testAuth);

  planningRouter.get('/:week', async (req, res) => {
    try {
      const me = (req as any).user;
      const groupId = req.query.groupId as string | undefined;
      let userIds = [me.id];
      if (groupId) {
        const members = await db.all(
          'SELECT user_id FROM group_members WHERE group_id = ?',
          groupId,
        );
        userIds = members.map((m: any) => m.user_id);
      }
      const placeholders = userIds.map(() => '?').join(',');
      const rows = await db.all(
        `SELECT p.*, r.name as recipe_name_lookup FROM planning p LEFT JOIN recipes r ON r.id = p.recipe_id WHERE p.week = ? AND p.user_id IN (${placeholders})`,
        req.params.week,
        ...userIds,
      );
      const items = rows.map((r: any) => ({
        kind: 'recipe',
        id: r.id,
        user_id: r.user_id,
        recipe_id: r.recipe_id,
        recipe_name: r.recipe_name || r.recipe_name_lookup || '',
        week: r.week,
        day: r.day,
        meal: r.meal,
      }));
      res.json({ startDate: req.params.week, recipes: items });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  planningRouter.post('/', async (req, res) => {
    try {
      const me = (req as any).user;
      const { recipe_id, recipe_name, week, day, meal } = req.body;
      const id = crypto.randomUUID();
      await db.run(
        'INSERT INTO planning (id, recipe_id, recipe_name, week, day, meal, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        id,
        recipe_id,
        recipe_name || '',
        week,
        day || null,
        meal || null,
        me.id,
      );
      res.json({
        kind: 'recipe',
        id,
        user_id: me.id,
        recipe_id,
        recipe_name: recipe_name || '',
        week,
        day,
        meal,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  planningRouter.put('/:id', async (req, res) => {
    try {
      const { day, meal } = req.body;
      await db.run(
        'UPDATE planning SET day = ?, meal = ? WHERE id = ?',
        day || null,
        meal || null,
        req.params.id,
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  planningRouter.delete('/:id', async (req, res) => {
    try {
      await db.run('DELETE FROM planning WHERE id = ?', req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  planningRouter.get('/:week/shopping-list', async (req, res) => {
    try {
      const me = (req as any).user;
      const groupId = req.query.groupId as string | undefined;
      let userIds = [me.id];
      if (groupId) {
        const members = await db.all(
          'SELECT user_id FROM group_members WHERE group_id = ?',
          groupId,
        );
        userIds = members.map((m: any) => m.user_id);
      }
      const placeholders = userIds.map(() => '?').join(',');
      const rows = await db.all(
        `SELECT ri.food_id, ri.name, ri.quantity_value, ri.quantity_unit
         FROM planning p JOIN recipe_ingredients ri ON ri.recipe_id = p.recipe_id
         WHERE p.week = ? AND p.user_id IN (${placeholders})`,
        req.params.week,
        ...userIds,
      );
      const map: Record<string, any> = {};
      for (const r of rows) {
        const key = r.name || r.food_id || crypto.randomUUID();
        if (map[key]) {
          map[key].quantity.value = (map[key].quantity.value || 0) + (r.quantity_value || 0);
        } else {
          map[key] = {
            id: r.food_id || key,
            name: r.name,
            quantity: { value: r.quantity_value || 0, unit: r.quantity_unit },
          };
        }
      }
      res.json(Object.values(map));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Groups routes (inline, using test db) ──────────
  const groupsRouter = express.Router();
  groupsRouter.use(testAuth);

  groupsRouter.get('/mine', async (req, res) => {
    try {
      const me = (req as any).user;
      const row = await db.get(
        `SELECT g.id FROM groups_table g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = ? LIMIT 1`,
        me.id,
      );
      if (!row) {
        res.json(null);
        return;
      }
      const members = await db.all('SELECT user_id FROM group_members WHERE group_id = ?', row.id);
      res.json({ id: row.id, users: members.map((m: any) => m.user_id) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  groupsRouter.post('/', async (req, res) => {
    try {
      const me = (req as any).user;
      const id = crypto.randomUUID();
      await db.run('INSERT INTO groups_table (id) VALUES (?)', id);
      await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', id, me.id);
      res.json({ id, users: [me.id] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  groupsRouter.post('/:id/join', async (req, res) => {
    try {
      const me = (req as any).user;
      await db.run(
        'INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)',
        req.params.id,
        me.id,
      );
      const members = await db.all(
        'SELECT user_id FROM group_members WHERE group_id = ?',
        req.params.id,
      );
      res.json({ id: req.params.id, users: members.map((m: any) => m.user_id) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  groupsRouter.post('/:id/leave', async (req, res) => {
    try {
      const me = (req as any).user;
      await db.run(
        'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
        req.params.id,
        me.id,
      );
      const members = await db.all(
        'SELECT user_id FROM group_members WHERE group_id = ?',
        req.params.id,
      );
      res.json({ id: req.params.id, users: members.map((m: any) => m.user_id) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.use('/planning', planningRouter);
  app.use('/groups', groupsRouter);

  return app;
}
