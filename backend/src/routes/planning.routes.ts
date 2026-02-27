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

planningRouter.get('/:week', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const groupId = req.query.groupId as string | undefined;
    const db = await getDB();

    let userIds = [me.id];
    if (groupId) {
      const members = await db.all('SELECT user_id FROM group_members WHERE group_id = ?', groupId);
      userIds = members.map((m: { user_id: string }) => m.user_id);
    }

    const placeholders = userIds.map(() => '?').join(',');
    const rows = await db.all(
      `SELECT p.*, r.name as recipe_name_lookup, r.min_servings, r.split_servings FROM planning p LEFT JOIN recipes r ON r.id = p.recipe_id WHERE p.week = ? AND p.user_id IN (${placeholders})`,
      req.params.week,
      ...userIds,
    );

    const items = rows.map(
      (r: {
        id: string;
        user_id: string;
        recipe_id: string;
        recipe_name: string;
        recipe_name_lookup: string;
        week: string;
        day: string;
        meal: string;
        servings: number;
        assigned_to: string;
        min_servings: number;
        split_servings: number;
      }) => ({
        kind: 'recipe' as const,
        id: r.id,
        user_id: r.user_id,
        recipe_id: r.recipe_id,
        recipe_name: r.recipe_name || r.recipe_name_lookup || '',
        week: r.week,
        day: r.day,
        meal: r.meal,
        servings: r.servings || 1,
        assignedTo: r.assigned_to || null,
        minServings: r.min_servings || 1,
        splitServings: r.split_servings || 1,
      }),
    );

    res.json({ startDate: req.params.week, recipes: items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

planningRouter.post('/', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const { recipe_id, recipe_name, week, day, meal, servings, assignedTo } = req.body;
    const db = await getDB();
    const id = uuidv4();
    await db.run(
      'INSERT INTO planning (id, recipe_id, recipe_name, week, day, meal, user_id, servings, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id,
      recipe_id,
      recipe_name || '',
      week,
      day || null,
      meal || null,
      me.id,
      servings || 1,
      assignedTo || null,
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
      servings: servings || 1,
      assignedTo: assignedTo || null,
    };
    res.json(result);

    // Real-time: notify group members
    const groupId = await findUserGroupId(me.id);
    if (groupId) {
      emitPlanningChange(groupId, 'planning:added', result);
      emitShoppingListInvalidate(groupId, week);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

planningRouter.put('/:id', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const { day, meal, servings, assignedTo } = req.body;
    const db = await getDB();
    await db.run(
      'UPDATE planning SET day = ?, meal = ?, servings = ?, assigned_to = ? WHERE id = ?',
      day || null,
      meal || null,
      servings || 1,
      assignedTo || null,
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
        servings: servings || 1,
        assignedTo: assignedTo || null,
        week: updated.week,
      });
      emitShoppingListInvalidate(groupId, updated.week);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

planningRouter.delete('/:id', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

planningRouter.get('/:week/shopping-list', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const groupId = req.query.groupId as string | undefined;
    const db = await getDB();

    let userIds = [me.id];
    if (groupId) {
      const members = await db.all('SELECT user_id FROM group_members WHERE group_id = ?', groupId);
      userIds = members.map((m: { user_id: string }) => m.user_id);
    }

    const placeholders = userIds.map(() => '?').join(',');
    const rows = await db.all(
      `SELECT ri.food_id, ri.name, ri.quantity_value, ri.quantity_unit, f.name as food_name_en, f.name_it as food_name_it, p.servings as planned_servings, r.servings as recipe_servings
       FROM planning p 
       JOIN recipes r ON r.id = p.recipe_id
       JOIN recipe_ingredients ri ON ri.recipe_id = p.recipe_id
       LEFT JOIN foods f ON ri.food_id = f.id
       WHERE p.week = ? AND p.user_id IN (${placeholders})`,
      req.params.week,
      ...userIds,
    );
    const map: Record<
      string,
      { id: string; name: string; quantity: { value: number; unit: string } }
    > = {};
    for (const r of rows) {
      const translatedName = lang === 'it' ? r.food_name_it || r.name : r.food_name_en || r.name;
      const key = translatedName || r.food_id || uuidv4();

      const plannedServings = r.planned_servings || 1;
      const recipeServings = r.recipe_servings || 1;
      const multiplier = plannedServings / recipeServings;
      const quantityValue = (r.quantity_value || 0) * multiplier;

      if (map[key]) {
        map[key].quantity.value = (map[key].quantity.value || 0) + quantityValue;
      } else {
        map[key] = {
          id: r.food_id || key,
          name: translatedName,
          quantity: { value: quantityValue, unit: r.quantity_unit },
        };
      }
    }
    res.json(Object.values(map));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
