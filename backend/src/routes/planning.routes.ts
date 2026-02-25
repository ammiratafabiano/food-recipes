import express from 'express';
import { getDB } from '../db';
import crypto from 'crypto';
const uuidv4 = () => crypto.randomUUID();
import { authenticateToken, JwtPayload } from '../auth.middleware';
import { emitPlanningChange, emitShoppingListInvalidate } from '../socket';

export const planningRouter = express.Router();
planningRouter.use(authenticateToken);

/** Find the group a user belongs to (if any) */
async function findUserGroupId(userId: string): Promise<string | null> {
  const db = await getDB();
  const row = await db.get('SELECT group_id FROM group_members WHERE user_id = ? LIMIT 1', userId);
  return row ? row.group_id : null;
}

planningRouter.get('/:week', async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const groupId = req.query.groupId as string | undefined;
    const db = await getDB();

    let userIds = [me.id];
    if (groupId) {
      const members = await db.all('SELECT user_id FROM group_members WHERE group_id = ?', groupId);
      userIds = members.map((m: any) => m.user_id);
    }

    const placeholders = userIds.map(() => '?').join(',');
    const rows = await db.all(
      `SELECT p.*, r.name as recipe_name_lookup FROM planning p LEFT JOIN recipes r ON r.id = p.recipe_id WHERE p.week = ? AND p.user_id IN (${placeholders})`,
      req.params.week,
      ...userIds,
    );

    const items = rows.map((r: any) => ({
      kind: 'recipe' as const,
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
    const me = (req as any).user as JwtPayload;
    const { recipe_id, recipe_name, week, day, meal } = req.body;
    const db = await getDB();
    const id = uuidv4();
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
    const result = {
      kind: 'recipe',
      id,
      user_id: me.id,
      recipe_id,
      recipe_name: recipe_name || '',
      week,
      day,
      meal,
    };
    res.json(result);

    // Real-time: notify group members
    const groupId = await findUserGroupId(me.id);
    if (groupId) {
      emitPlanningChange(groupId, 'planning:added', result);
      emitShoppingListInvalidate(groupId, week);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

planningRouter.put('/:id', async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const { day, meal } = req.body;
    const db = await getDB();
    await db.run(
      'UPDATE planning SET day = ?, meal = ? WHERE id = ?',
      day || null,
      meal || null,
      req.params.id,
    );
    const updated = await db.get('SELECT * FROM planning WHERE id = ?', req.params.id);
    res.json({ success: true });

    // Real-time: notify group members
    const groupId = await findUserGroupId(me.id);
    if (groupId && updated) {
      emitPlanningChange(groupId, 'planning:updated', {
        id: req.params.id,
        day,
        meal,
        week: updated.week,
      });
      emitShoppingListInvalidate(groupId, updated.week);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

planningRouter.delete('/:id', async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    const item = await db.get('SELECT * FROM planning WHERE id = ?', req.params.id);
    await db.run('DELETE FROM planning WHERE id = ?', req.params.id);
    res.json({ success: true });

    // Real-time: notify group members
    const groupId = await findUserGroupId(me.id);
    if (groupId && item) {
      emitPlanningChange(groupId, 'planning:deleted', { id: req.params.id, week: item.week });
      emitShoppingListInvalidate(groupId, item.week);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

planningRouter.get('/:week/shopping-list', async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const groupId = req.query.groupId as string | undefined;
    const db = await getDB();

    let userIds = [me.id];
    if (groupId) {
      const members = await db.all('SELECT user_id FROM group_members WHERE group_id = ?', groupId);
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
      const key = r.name || r.food_id || uuidv4();
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
