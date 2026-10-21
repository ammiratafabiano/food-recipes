import express, { Request, Response } from 'express';
import { getDB } from '../db';
import crypto from 'crypto';
const uuidv4 = () => crypto.randomUUID();
import { authenticateToken, AuthenticatedRequest } from '../auth.middleware';
import { emitPlanningChange, emitShoppingListInvalidate } from '../socket';
import { GroupService } from '../services/group.service';
import { ResolvedIngredient } from '../services/ingredient-resolver.service';

export const planningRouter = express.Router();
planningRouter.use(authenticateToken);

planningRouter.get('/:week', async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
    const groupId = req.query.groupId as string | undefined;
    const db = await getDB();

    let userIds = [me.id];
    if (groupId) {
      userIds = await GroupService.getGroupMemberUserIds(groupId);
      if (userIds.length === 0) userIds = [me.id];
    }

    const placeholders = userIds.map(() => '?').join(',');
    const rows = await db.all(
      `SELECT p.*, r.name as recipe_name_lookup, r.min_servings, r.split_servings 
       FROM planning p 
       LEFT JOIN recipes r ON r.id = p.recipe_id 
       WHERE p.week = ? AND p.user_id IN (${placeholders}) 
       ORDER BY p.sort_order`,
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

planningRouter.post('/:week/quick-add', async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
    const { foodId, foodName, day, isCustom, ingredients } = req.body as {
      foodId: string;
      foodName: string;
      day?: string;
      isCustom?: boolean;
      ingredients?: ResolvedIngredient[];
    };
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
      const food = await db.get(
        'SELECT default_unit, portion_value FROM foods WHERE id = ?',
        foodId,
      );
      const safeUnit = food?.default_unit || 'GRAM';
      const safePortion =
        food?.portion_value || (safeUnit === 'GRAM' || safeUnit === 'MILLILITER' ? 100 : 1);

      const rId = uuidv4();
      await db.run(
        'INSERT INTO recipes (id, user_id, name, type, servings, time_value, time_unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
        rId,
        me.id,
        foodName,
        'PRODUCT',
        1,
        0,
        'MINUTES',
      );

      // If user provided specific ingredients (e.g. from internet suggestion)
      if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
        for (let i = 0; i < ingredients.length; i++) {
          const ing = ingredients[i];
          await db.run(
            'INSERT INTO recipe_ingredients (id, recipe_id, name, quantity_value, quantity_unit, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            uuidv4(),
            rId,
            ing.name,
            ing.quantity_value ?? ing.quantity ?? null,
            ing.quantity_unit ?? ing.unit ?? null,
            i,
          );
        }
      } else if (!isCustom) {
        // Non-custom simple item gets a standard ingredient row
        await db.run(
          'INSERT INTO recipe_ingredients (id, recipe_id, food_id, name, quantity_value, quantity_unit) VALUES (?, ?, ?, ?, ?)',
          uuidv4(),
          rId,
          foodId,
          foodName,
          safePortion,
          safeUnit,
        );
      }
      recipe = { id: rId, name: foodName };
    } else if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
      // If recipe existed but user now provided ingredients
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        await db.run(
          'INSERT INTO recipe_ingredients (id, recipe_id, name, quantity_value, quantity_unit, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          uuidv4(),
          recipe.id,
          ing.name,
          ing.quantity_value ?? ing.quantity ?? null,
          ing.quantity_unit ?? ing.unit ?? null,
          i,
        );
      }
    }

    const pId = uuidv4();

    // Compute group-aware servings
    let servings = 1;
    const groupId = await GroupService.findUserGroupId(me.id);
    if (groupId) {
      const members = await GroupService.getGroupMemberUserIds(groupId);
      servings = members.length || 1;
    }

    // Compute next sort_order for this week
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
      emitShoppingListInvalidate(groupId, req.params.week as string);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

planningRouter.post('/', async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
    const { recipe_id, recipe_name, week, day, meal, servings, assignedTo } = req.body;
    const db = await getDB();
    const id = uuidv4();

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

    const groupId = await GroupService.findUserGroupId(me.id);
    if (groupId) {
      emitPlanningChange(groupId, 'planning:added', result);
      emitShoppingListInvalidate(groupId, week);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

planningRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
    const { day, meal, servings, assignedTo, excludeFromShopping, sortOrder } = req.body;
    const db = await getDB();

    const existing = await db.get('SELECT * FROM planning WHERE id = ?', req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Planning item not found' });
    }

    if (existing.user_id !== me.id) {
      const allowed = await GroupService.areUsersInSameGroup(me.id, existing.user_id);
      if (!allowed) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

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

    const groupId = await GroupService.findUserGroupId(me.id);
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

planningRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
    const db = await getDB();
    const item = await db.get('SELECT * FROM planning WHERE id = ?', req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Planning item not found' });
    }

    // Ownership / group check (Report 6.2)
    if (item.user_id !== me.id) {
      const allowed = await GroupService.areUsersInSameGroup(me.id, item.user_id);
      if (!allowed) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    await db.run('DELETE FROM planning WHERE id = ?', req.params.id);
    res.json({ success: true });

    const groupId = await GroupService.findUserGroupId(me.id);
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

planningRouter.put('/:week/reorder', async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
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

    const groupId = await GroupService.findUserGroupId(me.id);
    if (groupId) {
      emitPlanningChange(groupId, 'planning:updated', { week: req.params.week, user_id: me.id });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

planningRouter.get('/:week/nutrition-summary', async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
    const groupId = req.query.groupId as string | undefined;
    const assignedTo = req.query.assignedTo as string | undefined;
    const db = await getDB();

    let userIds = [me.id];
    if (groupId) {
      userIds = await GroupService.getGroupMemberUserIds(groupId);
      if (userIds.length === 0) userIds = [me.id];
    }

    const placeholders = userIds.map(() => '?').join(',');

    let assignedFilter = '';
    const params: (string | number)[] = [req.params.week as string, ...userIds];

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

    const noIngredientRows = await db.all(
      `SELECT DISTINCT r.name as recipe_name
       FROM planning p
       JOIN recipes r ON r.id = p.recipe_id
       WHERE p.week = ? AND p.user_id IN (${placeholders})${assignedFilter}
         AND NOT EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id)`,
      ...params,
    );

    const toGrams = (value: number, unit: string): number => {
      switch (unit) {
        case 'GRAM':
          return value;
        case 'KILO':
          return value * 1000;
        case 'LITER':
        case 'MILLILITER':
          return value;
        case 'PIECE':
          return value * 100;
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

    for (const r of noIngredientRows) {
      if (r.recipe_name) missingNutritionRecipes.add(r.recipe_name);
    }

    for (const r of rows) {
      const plannedServings = r.planned_servings || 1;
      const recipeServings = r.recipe_servings || 1;
      const multiplier = plannedServings / recipeServings;

      if (r.kcal == null && r.protein == null && r.fat == null && r.carbs == null) {
        if (r.recipe_name) missingNutritionRecipes.add(r.recipe_name);
        continue;
      }

      const quantityValue = (r.quantity_value || 0) * multiplier;
      const unit = r.quantity_unit || r.default_unit || 'GRAM';
      const grams = toGrams(quantityValue, unit);
      const factor = grams / 100;

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

    const round = (v: number) => Math.round(v * 10) / 10;
    for (const key of Object.keys(days)) {
      days[key].kcal = round(days[key].kcal);
      days[key].protein = round(days[key].protein);
      days[key].fat = round(days[key].fat);
      days[key].carbs = round(days[key].carbs);
      days[key].fiber = round(days[key].fiber);
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

planningRouter.get('/:week/suggestions', async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
    const groupId = req.query.groupId as string | undefined;
    const db = await getDB();

    let userIds = [me.id];
    if (groupId) {
      userIds = await GroupService.getGroupMemberUserIds(groupId);
      if (userIds.length === 0) userIds = [me.id];
    }

    const placeholders = userIds.map(() => '?').join(',');

    const currentWeekRecipes = await db.all(
      `SELECT DISTINCT recipe_id FROM planning WHERE week = ? AND user_id IN (${placeholders})`,
      req.params.week,
      ...userIds,
    );
    const currentRecipeIds = new Set(
      currentWeekRecipes.map((r: { recipe_id: string }) => r.recipe_id),
    );

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
       LIMIT 100`,
      ...userIds,
      ...userIds,
    );

    const suggestions = rows
      .filter((r: { recipe_id: string }) => !currentRecipeIds.has(r.recipe_id))
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

planningRouter.post('/:week/suggestions/:recipeId/dismiss', async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
    const db = await getDB();
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

planningRouter.get('/:week/shopping-list', async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const groupId = req.query.groupId as string | undefined;
    const db = await getDB();

    let userIds = [me.id];
    if (groupId) {
      userIds = await GroupService.getGroupMemberUserIds(groupId);
      if (userIds.length === 0) userIds = [me.id];
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
      const key = (translatedName || r.food_id || uuidv4()).toLowerCase().trim();

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

    const wipLabel = lang === 'it' ? 'Cose per' : 'Stuff for';
    for (const w of wipRows) {
      const key = `wip:${w.recipe_id}`;
      map[key] = {
        id: key,
        name: `${wipLabel} ${w.recipe_name}`,
        quantity: { value: 0, unit: '' },
      };
    }

    const round1 = (v: number) => Math.round(v * 10) / 10;

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
