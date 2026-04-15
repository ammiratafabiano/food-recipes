import express from 'express';
import { getDB } from '../db';
import crypto from 'crypto';
const uuidv4 = () => crypto.randomUUID();
import { authenticateToken, optionalAuthenticateToken, JwtPayload } from '../auth.middleware';

export const recipesRouter = express.Router();

function toMinOne(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.trunc(parsed));
}

async function buildRecipe(
  recipeRow: {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    cuisine?: string;
    type?: string;
    time_value?: number;
    time_unit?: string;
    difficulty?: string;
    servings?: number;
    min_servings?: number;
    split_servings?: number;
    wip?: number;
    notes?: string;
  },
  userId?: string,
  lang: string = 'en',
) {
  const db = await getDB();
  const ingredients = await db.all(
    `SELECT ri.*, f.name as food_name_en, f.name_it as food_name_it 
     FROM recipe_ingredients ri 
     LEFT JOIN foods f ON ri.food_id = f.id 
     WHERE ri.recipe_id = ? 
     ORDER BY ri.sort_order`,
    recipeRow.id,
  );
  const steps = await db.all(
    'SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY sort_order',
    recipeRow.id,
  );
  const tagRows = await db.all('SELECT tag FROM recipe_tags WHERE recipe_id = ?', recipeRow.id);
  const user = await db.get('SELECT name FROM users WHERE id = ?', recipeRow.user_id);

  let isAdded = false;
  if (userId) {
    const saved = await db.get(
      'SELECT 1 FROM saved_recipes WHERE user_id = ? AND recipe_id = ?',
      userId,
      recipeRow.id,
    );
    isAdded = !!saved;
  }

  return {
    id: recipeRow.id,
    userId: recipeRow.user_id,
    userName: user?.name || '',
    name: recipeRow.name,
    description: recipeRow.description || '',
    cuisine: recipeRow.cuisine || '',
    type: recipeRow.type || 'OTHER',
    time: { value: recipeRow.time_value, unit: recipeRow.time_unit || 'MINUTE' },
    difficulty: recipeRow.difficulty || 'EASY',
    ingredients: ingredients.map(
      (i: {
        id: string;
        food_id?: string;
        name: string;
        food_name_en?: string;
        food_name_it?: string;
        quantity_value?: number;
        quantity_unit?: string;
        brand?: string;
      }) => ({
        id: i.food_id || i.id,
        name: lang === 'it' ? i.food_name_it || i.name : i.food_name_en || i.name,
        quantity: { value: i.quantity_value, unit: i.quantity_unit },
        brand: i.brand || '',
      }),
    ),
    steps: steps.map((s: { text: string; image_url?: string }) => ({
      text: s.text,
      imageUrl: s.image_url || '',
    })),
    tags: tagRows.map((t: { tag: string }) => t.tag),
    servings: recipeRow.servings || 4,
    minServings: recipeRow.min_servings || 1,
    splitServings: recipeRow.split_servings || 1,
    wip: !!recipeRow.wip,
    notes: recipeRow.notes || '',
    isAdded,
  };
}

async function saveRecipeDetails(
  recipeId: string,
  ingredients: {
    id?: string;
    name: string;
    quantity?: { value?: number; unit?: string };
    brand?: string;
  }[],
  steps: { text: string; imageUrl?: string }[],
  tags: string[],
) {
  const db = await getDB();
  await db.run('BEGIN');
  try {
    await db.run('DELETE FROM recipe_ingredients WHERE recipe_id = ?', recipeId);
    await db.run('DELETE FROM recipe_steps WHERE recipe_id = ?', recipeId);
    await db.run('DELETE FROM recipe_tags WHERE recipe_id = ?', recipeId);

    for (let i = 0; i < (ingredients || []).length; i++) {
      const ing = ingredients[i];
      await db.run(
        `INSERT INTO recipe_ingredients (id, recipe_id, food_id, name, quantity_value, quantity_unit, sort_order, brand)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        uuidv4(),
        recipeId,
        ing.id || null,
        ing.name,
        ing.quantity?.value ?? null,
        ing.quantity?.unit || null,
        i,
        ing.brand || '',
      );
    }

    for (let i = 0; i < (steps || []).length; i++) {
      const step = steps[i];
      await db.run(
        `INSERT INTO recipe_steps (id, recipe_id, text, image_url, sort_order) VALUES (?, ?, ?, ?, ?)`,
        uuidv4(),
        recipeId,
        step.text,
        step.imageUrl || '',
        i,
      );
    }

    for (const tag of tags || []) {
      await db.run(
        'INSERT OR IGNORE INTO recipe_tags (recipe_id, tag) VALUES (?, ?)',
        recipeId,
        tag,
      );
    }
    await db.run('COMMIT');
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
}

recipesRouter.get('/', optionalAuthenticateToken, async (req: any, res) => {
  try {
    const me = req.user as JwtPayload | undefined;
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const userId = req.query.userId as string | undefined;
    if (!userId && !me) {
      res.status(401).json({ error: 'Missing token' });
      return;
    }
    const effectiveUserId = userId || me!.id;
    const db = await getDB();
    const isOwnRecipes = me && effectiveUserId === me.id;
    const query = isOwnRecipes
      ? 'SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM recipes WHERE user_id = ? AND (wip IS NULL OR wip = 0) ORDER BY created_at DESC';
    const rows = await db.all(query, effectiveUserId);
    const recipes = await Promise.all(
      rows.map(
        (r: {
          id: string;
          user_id: string;
          name: string;
          description?: string;
          cuisine?: string;
          type?: string;
          time_value?: number;
          time_unit?: string;
          difficulty?: string;
          servings?: number;
          min_servings?: number;
          split_servings?: number;
          wip?: number;
          notes?: string;
        }) => buildRecipe(r, me?.id, lang),
      ),
    );
    res.json(recipes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.get('/saved', authenticateToken, async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const db = await getDB();
    const rows = await db.all(
      `SELECT r.* FROM recipes r JOIN saved_recipes sr ON sr.recipe_id = r.id WHERE sr.user_id = ? ORDER BY sr.created_at DESC`,
      me.id,
    );
    const recipes = await Promise.all(
      rows.map(
        (r: {
          id: string;
          user_id: string;
          name: string;
          description?: string;
          cuisine?: string;
          type?: string;
          time_value?: number;
          time_unit?: string;
          difficulty?: string;
          servings?: number;
          min_servings?: number;
          split_servings?: number;
          wip?: number;
          notes?: string;
        }) => buildRecipe(r, me.id, lang),
      ),
    );
    res.json(recipes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.get('/group', authenticateToken, async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const db = await getDB();

    // Find the user's group
    const membership = await db.get(
      'SELECT group_id FROM group_members WHERE user_id = ? LIMIT 1',
      me.id,
    );
    if (!membership) {
      res.json([]);
      return;
    }

    // Get all group members except the current user
    const members = await db.all(
      'SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?',
      membership.group_id,
      me.id,
    );
    if (members.length === 0) {
      res.json([]);
      return;
    }

    const memberIds = members.map((m: { user_id: string }) => m.user_id);
    const placeholders = memberIds.map(() => '?').join(',');
    const rows = await db.all(
      `SELECT * FROM recipes WHERE user_id IN (${placeholders}) AND (wip IS NULL OR wip = 0) AND type != 'PRODUCT' ORDER BY name COLLATE NOCASE`,
      ...memberIds,
    );

    const recipes = await Promise.all(
      rows.map(
        (r: {
          id: string;
          user_id: string;
          name: string;
          description?: string;
          cuisine?: string;
          type?: string;
          time_value?: number;
          time_unit?: string;
          difficulty?: string;
          servings?: number;
          min_servings?: number;
          split_servings?: number;
          wip?: number;
          notes?: string;
        }) => buildRecipe(r, me.id, lang),
      ),
    );
    res.json(recipes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.get('/discover', authenticateToken, async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const db = await getDB();
    const rows = await db.all(
      'SELECT * FROM recipes WHERE (wip IS NULL OR wip = 0) ORDER BY created_at DESC LIMIT 50',
    );
    const recipes = await Promise.all(
      rows.map(
        (r: {
          id: string;
          user_id: string;
          name: string;
          description?: string;
          cuisine?: string;
          type?: string;
          time_value?: number;
          time_unit?: string;
          difficulty?: string;
          servings?: number;
          min_servings?: number;
          split_servings?: number;
          wip?: number;
          notes?: string;
        }) => buildRecipe(r, me.id, lang),
      ),
    );
    res.json(recipes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.get('/:id', optionalAuthenticateToken, async (req: any, res) => {
  try {
    const me = req.user as JwtPayload | undefined;
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const db = await getDB();
    const row = await db.get('SELECT * FROM recipes WHERE id = ?', req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    // WIP recipes are only visible to their owner
    if (row.wip && (!me || row.user_id !== me.id)) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    const recipe = await buildRecipe(row, me?.id, lang);
    res.json(recipe);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.post('/', authenticateToken, async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const {
      name,
      description,
      cuisine,
      type,
      difficulty,
      time,
      ingredients,
      steps,
      tags,
      servings,
      minServings,
      splitServings,
      wip,
      notes,
    } = req.body;
    const normalizedServings = toMinOne(servings, 4);
    const normalizedMinServings = toMinOne(minServings, 1);
    const normalizedSplitServings = toMinOne(splitServings, 1);
    const db = await getDB();
    const id = uuidv4();
    await db.run(
      `INSERT INTO recipes (id, user_id, name, description, cuisine, type, difficulty, time_value, time_unit, servings, min_servings, split_servings, wip, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      me.id,
      name,
      description || '',
      cuisine || '',
      type || 'OTHER',
      difficulty || 'EASY',
      time?.value ?? null,
      time?.unit ?? 'MINUTE',
      normalizedServings,
      normalizedMinServings,
      normalizedSplitServings,
      wip ? 1 : 0,
      notes || '',
    );
    await saveRecipeDetails(id, ingredients, steps, tags);
    const row = await db.get('SELECT * FROM recipes WHERE id = ?', id);
    if (!row) {
      res.status(404).json({ error: 'Recipe not found after creation' });
      return;
    }
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const recipe = await buildRecipe(row, me.id, lang);
    res.json({ data: recipe });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.put('/:id', authenticateToken, async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const {
      name,
      description,
      cuisine,
      type,
      difficulty,
      time,
      ingredients,
      steps,
      tags,
      servings,
      minServings,
      splitServings,
      wip,
      notes,
    } = req.body;
    const normalizedServings = toMinOne(servings, 4);
    const normalizedMinServings = toMinOne(minServings, 1);
    const normalizedSplitServings = toMinOne(splitServings, 1);
    const db = await getDB();
    const existing = await db.get(
      'SELECT * FROM recipes WHERE id = ? AND user_id = ?',
      req.params.id,
      me.id,
    );
    if (!existing) {
      res.status(404).json({ error: 'Recipe not found or not owned' });
      return;
    }
    await db.run(
      `UPDATE recipes SET name=?, description=?, cuisine=?, type=?, difficulty=?, time_value=?, time_unit=?, servings=?, min_servings=?, split_servings=?, wip=?, notes=? WHERE id = ?`,
      name,
      description || '',
      cuisine || '',
      type || 'OTHER',
      difficulty || 'EASY',
      time?.value ?? null,
      time?.unit ?? 'MINUTE',
      normalizedServings,
      normalizedMinServings,
      normalizedSplitServings,
      wip ? 1 : 0,
      notes || '',
      req.params.id,
    );
    await saveRecipeDetails(req.params.id, ingredients, steps, tags);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const db = await getDB();
    const recipe = await db.get('SELECT user_id FROM recipes WHERE id = ?', req.params.id);
    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    if (recipe.user_id !== me.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    await db.run('DELETE FROM recipes WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.post('/:id/save', authenticateToken, async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const db = await getDB();
    await db.run(
      'INSERT OR IGNORE INTO saved_recipes (user_id, recipe_id) VALUES (?, ?)',
      me.id,
      req.params.id,
    );
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.delete('/:id/save', authenticateToken, async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const db = await getDB();
    await db.run(
      'DELETE FROM saved_recipes WHERE user_id = ? AND recipe_id = ?',
      me.id,
      req.params.id,
    );
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
