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
      `SELECT p.*, r.name as recipe_name_lookup, r.min_servings, r.split_servings FROM planning p LEFT JOIN recipes r ON r.id = p.recipe_id WHERE p.week = ? AND p.user_id IN (${placeholders}) ORDER BY p.sort_order`,
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
        exclude_from_shopping: number;
        sort_order: number;
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
        excludeFromShopping: r.exclude_from_shopping === 1,
        sortOrder: r.sort_order || 0,
      }),
    );

    res.json({ startDate: req.params.week, recipes: items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

planningRouter.post('/:week/quick-add', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const { foodId, foodName, day, isCustom } = req.body;
    const db = await getDB();

    if (!foodId || !foodName) {
      return res.status(400).json({ error: 'Missing food data' });
    }

    let recipe = await db.get(
      'SELECT * FROM recipes WHERE user_id = ? AND type = ? AND name = ?',
      me.id,
      'PRODUCT',
      foodName,
    );

    if (!recipe) {
      // Find food element to assign default portion
      const food = await db.get(
        'SELECT default_unit, portion_value FROM foods WHERE id = ?',
        foodId,
      );
      const safeUnit = food?.default_unit || 'GRAM';
      const safePortion =
        food?.portion_value || (safeUnit === 'GRAM' || safeUnit === 'MILLILITER' ? 100 : 1);

      const rId = uuidv4();
      await db.run(
        'INSERT INTO recipes (id, name, type, servings, time_value, time_unit, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        rId,
        foodName,
        'PRODUCT',
        1,
        0,
        'MINUTES',
        me.id,
      );
      // Custom items have no ingredients so the shopping list shows them as "Cose per X";
      // non-custom items get a proper ingredient row so quantities are aggregated normally.
      if (!isCustom) {
        await db.run(
          'INSERT INTO recipe_ingredients (recipe_id, food_id, name, quantity_value, quantity_unit) VALUES (?, ?, ?, ?, ?)',
          rId,
          foodId,
          foodName,
          safePortion,
          safeUnit,
        );
      }
      recipe = { id: rId, name: foodName };
    }

    const pId = uuidv4();

    // Compute group-aware servings: use group size if user belongs to a group
    let servings = 1;
    const groupId = await findUserGroupId(me.id);
    if (groupId) {
      const members = await db.all('SELECT user_id FROM group_members WHERE group_id = ?', groupId);
      servings = members.length || 1;
    }

    // Compute next sort_order for this week (global across all users)
    const maxOrder = await db.get(
      'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM planning WHERE week = ?',
      req.params.week,
    );
    const sortOrder = (maxOrder?.max_order || 0) + 1;

    await db.run(
      'INSERT INTO planning (id, recipe_id, recipe_name, week, day, user_id, servings, exclude_from_shopping, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      pId,
      recipe.id,
      recipe.name,
      req.params.week,
      day || null,
      me.id,
      servings,
      0,
      sortOrder,
    );

    // Track usage for suggestions
    await db.run(
      'INSERT INTO recipe_usage (user_id, recipe_id, count) VALUES (?, ?, 1) ON CONFLICT(user_id, recipe_id) DO UPDATE SET count = count + 1',
      me.id,
      recipe.id,
    );

    const inserted = await db.get(
      'SELECT p.*, r.name as recipe_name_lookup, r.min_servings, r.split_servings FROM planning p LEFT JOIN recipes r ON r.id = p.recipe_id WHERE p.id = ?',
      pId,
    );

    const item = {
      kind: 'recipe' as const,
      id: inserted.id,
      user_id: inserted.user_id,
      recipe_id: inserted.recipe_id,
      recipe_name: inserted.recipe_name || inserted.recipe_name_lookup || '',
      week: inserted.week,
      day: inserted.day,
      meal: inserted.meal,
      servings: inserted.servings || 1,
      assignedTo: inserted.assigned_to,
      minServings: inserted.min_servings,
      splitServings: inserted.split_servings,
      excludeFromShopping: inserted.exclude_from_shopping === 1,
      sortOrder: inserted.sort_order || 0,
    };

    res.json({ success: true, item });

    if (groupId) {
      emitPlanningChange(groupId, 'planning:added', Object.assign({}, item, { user_id: me.id }));
      emitShoppingListInvalidate(groupId, req.params.week);
    }
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

    // Compute next sort_order for this week (global across all users)
    const maxOrder = await db.get(
      'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM planning WHERE week = ?',
      week,
    );
    const sortOrder = (maxOrder?.max_order || 0) + 1;

    await db.run(
      'INSERT INTO planning (id, recipe_id, recipe_name, week, day, meal, user_id, servings, assigned_to, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id,
      recipe_id,
      recipe_name || '',
      week,
      day || null,
      meal || null,
      me.id,
      servings || 1,
      assignedTo || null,
      sortOrder,
    );

    // Track usage for suggestions
    await db.run(
      'INSERT INTO recipe_usage (user_id, recipe_id, count) VALUES (?, ?, 1) ON CONFLICT(user_id, recipe_id) DO UPDATE SET count = count + 1',
      me.id,
      recipe_id,
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
      sortOrder,
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
    const { day, meal, servings, assignedTo, excludeFromShopping, sortOrder } = req.body;
    const db = await getDB();
    await db.run(
      'UPDATE planning SET day = ?, meal = ?, servings = ?, assigned_to = ?, exclude_from_shopping = ?, sort_order = COALESCE(?, sort_order) WHERE id = ?',
      day || null,
      meal || null,
      servings || 1,
      assignedTo || null,
      excludeFromShopping != null ? (excludeFromShopping ? 1 : 0) : 0,
      sortOrder ?? null,
      req.params.id,
    );
    const updated = await db.get('SELECT * FROM planning WHERE id = ?', req.params.id);
    res.json({ success: true });

    // Real-time: notify group members
    const groupId = await findUserGroupId(me.id);
    if (groupId && updated) {
      emitPlanningChange(groupId, 'planning:updated', {
        id: req.params.id,
        day: day ?? null,
        meal: meal ?? null,
        servings: servings || 1,
        assignedTo: assignedTo ?? null,
        excludeFromShopping: excludeFromShopping ?? false,
        week: updated.week,
        user_id: me.id,
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
      emitPlanningChange(groupId, 'planning:deleted', {
        id: req.params.id,
        week: item.week,
        user_id: me.id,
      });
      emitShoppingListInvalidate(groupId, item.week);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

planningRouter.put('/:week/reorder', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids must be an array' });
    }
    const db = await getDB();
    await db.run('BEGIN');
    try {
      for (let i = 0; i < ids.length; i++) {
        await db.run('UPDATE planning SET sort_order = ? WHERE id = ?', i, ids[i]);
      }
      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }
    res.json({ success: true });

    const groupId = await findUserGroupId(me.id);
    if (groupId) {
      emitPlanningChange(groupId, 'planning:updated', { week: req.params.week, user_id: me.id });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

planningRouter.get('/:week/nutrition-summary', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const groupId = req.query.groupId as string | undefined;
    const assignedTo = req.query.assignedTo as string | undefined; // userId or 'all'
    const db = await getDB();

    let userIds = [me.id];
    if (groupId) {
      const members = await db.all('SELECT user_id FROM group_members WHERE group_id = ?', groupId);
      userIds = members.map((m: { user_id: string }) => m.user_id);
    }

    const placeholders = userIds.map(() => '?').join(',');

    // Build the WHERE clause for assigned_to filtering
    // If assignedTo is not provided or 'all', show items assigned to everyone (NULL) or to any member
    // If assignedTo is a specific userId, show items assigned to NULL (everyone) or to that specific user
    let assignedFilter = '';
    const params: any[] = [req.params.week, ...userIds];

    if (assignedTo && assignedTo !== 'all') {
      assignedFilter = ` AND (p.assigned_to IS NULL OR p.assigned_to LIKE ?)`;
      params.push(`%${assignedTo}%`);
    }

    const rows = await db.all(
      `SELECT 
        p.day,
        r.name as recipe_name,
        ri.quantity_value,
        ri.quantity_unit,
        f.name as food_name,
        f.kcal,
        f.protein,
        f.fat,
        f.carbs,
        f.fiber,
        f.default_unit,
        p.servings as planned_servings,
        r.servings as recipe_servings
       FROM planning p
       JOIN recipes r ON r.id = p.recipe_id
       JOIN recipe_ingredients ri ON ri.recipe_id = p.recipe_id
       LEFT JOIN foods f ON ri.food_id = f.id
       WHERE p.week = ? AND p.user_id IN (${placeholders})${assignedFilter}`,
      ...params,
    );

    // Also find planned recipes with NO ingredients at all (custom/WIP)
    const noIngredientRows = await db.all(
      `SELECT DISTINCT r.name as recipe_name
       FROM planning p
       JOIN recipes r ON r.id = p.recipe_id
       WHERE p.week = ? AND p.user_id IN (${placeholders})${assignedFilter}
         AND NOT EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id)`,
      ...params,
    );

    // Helper to convert quantity to grams for nutritional calculation
    const toGrams = (value: number, unit: string): number => {
      switch (unit) {
        case 'GRAM':
          return value;
        case 'KILO':
          return value * 1000;
        case 'LITER':
          return value * 1000; // approximate 1ml = 1g
        case 'MILLILITER':
          return value; // approximate 1ml = 1g
        case 'PIECE':
          return value * 100; // approximate 1 piece = 100g
        default:
          return value;
      }
    };

    type DayNutrition = {
      kcal: number;
      protein: number;
      fat: number;
      carbs: number;
      fiber: number;
    };
    const days: Record<string, DayNutrition> = {};
    const weekTotal: DayNutrition = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
    const missingNutritionRecipes = new Set<string>();

    // Track recipes with no ingredients
    for (const r of noIngredientRows) {
      if (r.recipe_name) missingNutritionRecipes.add(r.recipe_name);
    }

    for (const r of rows) {
      const plannedServings = r.planned_servings || 1;
      const recipeServings = r.recipe_servings || 1;
      const multiplier = plannedServings / recipeServings;

      // If food has no nutritional info, track recipe and skip
      if (r.kcal == null && r.protein == null && r.fat == null && r.carbs == null) {
        if (r.recipe_name) missingNutritionRecipes.add(r.recipe_name);
        continue;
      }

      const quantityValue = (r.quantity_value || 0) * multiplier;
      const unit = r.quantity_unit || r.default_unit || 'GRAM';
      const grams = toGrams(quantityValue, unit);
      const factor = grams / 100; // nutritional values are per 100g

      const kcal = (r.kcal || 0) * factor;
      const protein = (r.protein || 0) * factor;
      const fat = (r.fat || 0) * factor;
      const carbs = (r.carbs || 0) * factor;
      const fiber = (r.fiber || 0) * factor;

      const day = r.day || 'UNASSIGNED';
      if (!days[day]) {
        days[day] = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
      }
      days[day].kcal += kcal;
      days[day].protein += protein;
      days[day].fat += fat;
      days[day].carbs += carbs;
      days[day].fiber += fiber;

      weekTotal.kcal += kcal;
      weekTotal.protein += protein;
      weekTotal.fat += fat;
      weekTotal.carbs += carbs;
      weekTotal.fiber += fiber;
    }

    // Round values and remove empty/unassigned days
    const round = (v: number) => Math.round(v * 10) / 10;
    for (const key of Object.keys(days)) {
      days[key].kcal = round(days[key].kcal);
      days[key].protein = round(days[key].protein);
      days[key].fat = round(days[key].fat);
      days[key].carbs = round(days[key].carbs);
      days[key].fiber = round(days[key].fiber);
      // Remove UNASSIGNED and all-zero entries from per-day breakdown
      if (
        key === 'UNASSIGNED' ||
        (!days[key].kcal &&
          !days[key].protein &&
          !days[key].fat &&
          !days[key].carbs &&
          !days[key].fiber)
      ) {
        delete days[key];
      }
    }

    res.json({
      week: req.params.week,
      days,
      weekTotal: {
        kcal: round(weekTotal.kcal),
        protein: round(weekTotal.protein),
        fat: round(weekTotal.fat),
        carbs: round(weekTotal.carbs),
        fiber: round(weekTotal.fiber),
      },
      missingNutritionFoods: [...missingNutritionRecipes],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

planningRouter.get('/:week/suggestions', async (req: any, res) => {
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

    // Get recipes already planned for the current week
    const currentWeekRecipes = await db.all(
      `SELECT DISTINCT recipe_id FROM planning WHERE week = ? AND user_id IN (${placeholders})`,
      req.params.week,
      ...userIds,
    );
    const currentRecipeIds = new Set(
      currentWeekRecipes.map((r: { recipe_id: string }) => r.recipe_id),
    );

    // Query recipe_usage: sum counts across all group members, order by total usage
    const rows = await db.all(
      `SELECT
        ru.recipe_id,
        r.name as recipe_name_lookup,
        r.type as recipe_type,
        SUM(ru.count) as frequency,
        MAX(p.week) as last_used_week,
        GROUP_CONCAT(DISTINCT p.meal) as meals_used
       FROM recipe_usage ru
       JOIN recipes r ON r.id = ru.recipe_id
       LEFT JOIN planning p ON p.recipe_id = ru.recipe_id AND p.user_id IN (${placeholders})
       WHERE ru.user_id IN (${placeholders})
       GROUP BY ru.recipe_id
       HAVING SUM(ru.count) > 0
       ORDER BY SUM(ru.count) DESC
       LIMIT 30`,
      ...userIds,
      ...userIds,
    );

    const suggestions = rows
      .filter((r: { recipe_id: string }) => !currentRecipeIds.has(r.recipe_id))
      .slice(0, 15)
      .map(
        (r: {
          recipe_id: string;
          recipe_name_lookup: string;
          recipe_type: string;
          frequency: number;
          last_used_week: string;
          meals_used: string;
        }) => ({
          recipe_id: r.recipe_id,
          recipe_name: r.recipe_name_lookup || '',
          recipe_type: r.recipe_type || 'OTHER',
          frequency: r.frequency,
          last_used_week: r.last_used_week,
          meals_used: r.meals_used ? [...new Set(r.meals_used.split(',').filter(Boolean))] : [],
        }),
      );

    res.json(suggestions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

planningRouter.post('/:week/suggestions/:recipeId/dismiss', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const db = await getDB();
    // Reset the usage count so the recipe can reappear once used again
    await db.run(
      'INSERT INTO recipe_usage (user_id, recipe_id, count) VALUES (?, ?, 0) ON CONFLICT(user_id, recipe_id) DO UPDATE SET count = 0',
      me.id,
      req.params.recipeId,
    );
    res.json({ success: true });
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
       WHERE p.week = ? AND p.user_id IN (${placeholders}) AND (p.exclude_from_shopping IS NULL OR p.exclude_from_shopping = 0)`,
      req.params.week,
      ...userIds,
    );

    // Find planned recipes with NO ingredients (WIP) → add "Cose per [recipe]" entries
    const wipRows = await db.all(
      `SELECT DISTINCT r.name as recipe_name, p.recipe_id
       FROM planning p
       JOIN recipes r ON r.id = p.recipe_id
       WHERE p.week = ? AND p.user_id IN (${placeholders})
         AND (p.exclude_from_shopping IS NULL OR p.exclude_from_shopping = 0)
         AND NOT EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id)`,
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

    // Add "Cose per [recipe]" entries for WIP recipes without ingredients
    const wipLabel = lang === 'it' ? 'Cose per' : 'Stuff for';
    for (const w of wipRows) {
      const key = `wip:${w.recipe_id}`;
      map[key] = {
        id: key,
        name: `${wipLabel} ${w.recipe_name}`,
        quantity: { value: 0, unit: '' },
      };
    }

    // Round quantities and filter out basic staples
    const round1 = (v: number) => Math.round(v * 10) / 10;

    // Ingredients to skip when added as "qb" (quantity = 0)
    const skipIfQB = new Set([
      'salt',
      'sale',
      'pepper',
      'pepe',
      'pepe nero',
      'olive oil',
      "olio d'oliva",
      "olio extravergine d'oliva",
      'olio extra vergine di oliva',
      'olio evo',
      'seed oil',
      'olio di semi',
      'olio di semi di girasole',
      'olio di semi vari',
      'sugar',
      'zucchero',
    ]);

    // Ingredients to always skip regardless of quantity
    const alwaysSkip = new Set(['water', 'acqua']);

    const result = Object.values(map)
      .map((item) => ({
        ...item,
        quantity: { ...item.quantity, value: round1(item.quantity.value) },
      }))
      .filter((item) => {
        const nameLower = item.name.toLowerCase().trim();
        if (alwaysSkip.has(nameLower)) return false;
        if (skipIfQB.has(nameLower) && !item.quantity.value) return false;
        return true;
      });

    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
