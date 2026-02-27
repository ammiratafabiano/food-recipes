import express from 'express';
import { getDB } from '../db';
import crypto from 'crypto';
const uuidv4 = () => crypto.randomUUID();
import { authenticateToken, JwtPayload } from '../auth.middleware';

export const recipesRouter = express.Router();
recipesRouter.use(authenticateToken);

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
      }) => ({
        id: i.food_id || i.id,
        name: lang === 'it' ? i.food_name_it || i.name : i.food_name_en || i.name,
        quantity: { value: i.quantity_value, unit: i.quantity_unit },
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
    isAdded,
  };
}

async function saveRecipeDetails(
  recipeId: string,
  ingredients: { id?: string; name: string; quantity?: { value?: number; unit?: string } }[],
  steps: { text: string; imageUrl?: string }[],
  tags: string[],
) {
  const db = await getDB();
  await db.run('DELETE FROM recipe_ingredients WHERE recipe_id = ?', recipeId);
  await db.run('DELETE FROM recipe_steps WHERE recipe_id = ?', recipeId);
  await db.run('DELETE FROM recipe_tags WHERE recipe_id = ?', recipeId);

  for (let i = 0; i < (ingredients || []).length; i++) {
    const ing = ingredients[i];
    await db.run(
      `INSERT INTO recipe_ingredients (id, recipe_id, food_id, name, quantity_value, quantity_unit, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      uuidv4(),
      recipeId,
      ing.id || null,
      ing.name,
      ing.quantity?.value ?? null,
      ing.quantity?.unit || null,
      i,
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
    await db.run('INSERT OR IGNORE INTO recipe_tags (recipe_id, tag) VALUES (?, ?)', recipeId, tag);
  }
}

recipesRouter.get('/', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const userId = (req.query.userId as string) || me.id;
    const db = await getDB();
    const rows = await db.all(
      'SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC',
      userId,
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
        }) => buildRecipe(r, me.id, lang),
      ),
    );
    res.json(recipes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.get('/saved', async (req: any, res) => {
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
        }) => buildRecipe(r, me.id, lang),
      ),
    );
    res.json(recipes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.get('/discover', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const db = await getDB();
    const rows = await db.all('SELECT * FROM recipes ORDER BY created_at DESC LIMIT 50');
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
        }) => buildRecipe(r, me.id, lang),
      ),
    );
    res.json(recipes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.get('/:id', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const db = await getDB();
    const row = await db.get('SELECT * FROM recipes WHERE id = ?', req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    const recipe = await buildRecipe(row, me.id, lang);
    res.json(recipe);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.post('/', async (req: any, res) => {
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
    } = req.body;
    const db = await getDB();
    const id = uuidv4();
    await db.run(
      `INSERT INTO recipes (id, user_id, name, description, cuisine, type, difficulty, time_value, time_unit, servings, min_servings, split_servings)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      me.id,
      name,
      description || '',
      cuisine || '',
      type || 'OTHER',
      difficulty || 'EASY',
      time?.value ?? null,
      time?.unit ?? 'MINUTE',
      servings || 4,
      minServings || 1,
      splitServings || 1,
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

recipesRouter.put('/:id', async (req: any, res) => {
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
    } = req.body;
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
      `UPDATE recipes SET name=?, description=?, cuisine=?, type=?, difficulty=?, time_value=?, time_unit=?, servings=?, min_servings=?, split_servings=? WHERE id = ?`,
      name,
      description || '',
      cuisine || '',
      type || 'OTHER',
      difficulty || 'EASY',
      time?.value ?? null,
      time?.unit ?? 'MINUTE',
      servings || 4,
      minServings || 1,
      splitServings || 1,
      req.params.id,
    );
    await saveRecipeDetails(req.params.id, ingredients, steps, tags);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.delete('/:id', async (req: any, res) => {
  try {
    const db = await getDB();
    await db.run('DELETE FROM recipes WHERE id = ?', req.params.id);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.post('/:id/save', async (req: any, res) => {
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

recipesRouter.delete('/:id/save', async (req: any, res) => {
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
