import express, { Request, Response } from 'express';
import { getDB } from '../db';
import crypto from 'crypto';
const uuidv4 = () => crypto.randomUUID();
import {
  authenticateToken,
  optionalAuthenticateToken,
  AuthenticatedRequest,
  JwtPayload,
} from '../auth.middleware';
import { z } from 'zod';
import { IngredientResolverService } from '../services/ingredient-resolver.service';

export const recipesRouter = express.Router();

function toMinOne(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.trunc(parsed));
}

export interface RecipeRow {
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
}

/**
 * High-performance batch builder: fetches all ingredients, steps, tags, users,
 * and bookmark statuses for a batch of recipes in 5 total queries, eliminating N+1 performance issues.
 */
async function buildRecipesBatch(recipeRows: RecipeRow[], userId?: string, lang: string = 'en') {
  if (recipeRows.length === 0) return [];
  const db = await getDB();
  const recipeIds = recipeRows.map((r) => r.id);
  const placeholders = recipeIds.map(() => '?').join(',');

  // 1. Batch load ingredients
  const allIngredients = await db.all(
    `SELECT ri.*, f.name as food_name_en, f.name_it as food_name_it 
     FROM recipe_ingredients ri 
     LEFT JOIN foods f ON ri.food_id = f.id 
     WHERE ri.recipe_id IN (${placeholders}) 
     ORDER BY ri.recipe_id, ri.sort_order`,
    ...recipeIds,
  );
  const ingredientsByRecipe: Record<string, any[]> = {};
  for (const ing of allIngredients) {
    if (!ingredientsByRecipe[ing.recipe_id]) ingredientsByRecipe[ing.recipe_id] = [];
    ingredientsByRecipe[ing.recipe_id].push({
      id: ing.food_id || ing.id,
      name: lang === 'it' ? ing.food_name_it || ing.name : ing.food_name_en || ing.name,
      quantity: { value: ing.quantity_value, unit: ing.quantity_unit },
      brand: ing.brand || '',
    });
  }

  // 2. Batch load steps
  const allSteps = await db.all(
    `SELECT * FROM recipe_steps WHERE recipe_id IN (${placeholders}) ORDER BY recipe_id, sort_order`,
    ...recipeIds,
  );
  const stepsByRecipe: Record<string, any[]> = {};
  for (const st of allSteps) {
    if (!stepsByRecipe[st.recipe_id]) stepsByRecipe[st.recipe_id] = [];
    stepsByRecipe[st.recipe_id].push({
      text: st.text,
      imageUrl: st.image_url || '',
    });
  }

  // 3. Batch load tags
  const allTags = await db.all(
    `SELECT recipe_id, tag FROM recipe_tags WHERE recipe_id IN (${placeholders})`,
    ...recipeIds,
  );
  const tagsByRecipe: Record<string, string[]> = {};
  for (const t of allTags) {
    if (!tagsByRecipe[t.recipe_id]) tagsByRecipe[t.recipe_id] = [];
    tagsByRecipe[t.recipe_id].push(t.tag);
  }

  // 4. Batch load owners
  const userIds = Array.from(new Set(recipeRows.map((r) => r.user_id)));
  const userPlaceholders = userIds.map(() => '?').join(',');
  const users = await db.all(
    `SELECT id, name FROM users WHERE id IN (${userPlaceholders})`,
    ...userIds,
  );
  const userMap: Record<string, string> = {};
  for (const u of users) {
    userMap[u.id] = u.name;
  }

  // 5. Batch load saved recipes
  const savedRecipeIds = new Set<string>();
  if (userId) {
    const saved = await db.all(
      `SELECT recipe_id FROM saved_recipes WHERE user_id = ? AND recipe_id IN (${placeholders})`,
      userId,
      ...recipeIds,
    );
    for (const s of saved) {
      savedRecipeIds.add(s.recipe_id);
    }
  }

  // Assemble the recipes
  return recipeRows.map((recipeRow) => ({
    id: recipeRow.id,
    userId: recipeRow.user_id,
    userName: userMap[recipeRow.user_id] || '',
    name: recipeRow.name,
    description: recipeRow.description || '',
    cuisine: recipeRow.cuisine || '',
    type: recipeRow.type || 'OTHER',
    time: { value: recipeRow.time_value, unit: recipeRow.time_unit || 'MINUTE' },
    difficulty: recipeRow.difficulty || 'EASY',
    ingredients: ingredientsByRecipe[recipeRow.id] || [],
    steps: stepsByRecipe[recipeRow.id] || [],
    tags: tagsByRecipe[recipeRow.id] || [],
    servings: recipeRow.servings || 4,
    minServings: recipeRow.min_servings || 1,
    splitServings: recipeRow.split_servings || 1,
    wip: !!recipeRow.wip,
    notes: recipeRow.notes || '',
    isAdded: savedRecipeIds.has(recipeRow.id),
  }));
}

async function buildRecipe(recipeRow: RecipeRow, userId?: string, lang: string = 'en') {
  const [recipe] = await buildRecipesBatch([recipeRow], userId, lang);
  return recipe;
}

async function saveRecipeDetails(
  recipeId: string,
  ingredients: {
    id?: string;
    name: string;
    quantity?: { value?: number | null; unit?: string | null };
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

// Zod schemas for validation
const recipeIngredientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  quantity: z
    .object({
      value: z.number().optional().nullable(),
      unit: z.string().optional().nullable(),
    })
    .optional(),
  brand: z.string().optional(),
});

const recipeStepSchema = z.object({
  text: z.string(),
  imageUrl: z.string().optional(),
});

const recipePayloadSchema = z.object({
  name: z.string().min(1, 'Il nome della ricetta è obbligatorio'),
  description: z.string().optional().default(''),
  cuisine: z.string().optional().default(''),
  type: z.string().optional().default('OTHER'),
  difficulty: z.string().optional().default('EASY'),
  time: z
    .object({
      value: z.number().optional().nullable(),
      unit: z.string().optional().default('MINUTE'),
    })
    .optional(),
  ingredients: z.array(recipeIngredientSchema).optional().default([]),
  steps: z.array(recipeStepSchema).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  servings: z.number().optional().default(4),
  minServings: z.number().optional().default(1),
  splitServings: z.number().optional().default(1),
  wip: z.boolean().or(z.number()).optional().default(false),
  notes: z.string().optional().default(''),
});

/**
 * Suggest ingredients for a dish (Feature 2 - Internet / Curated resolution without AI)
 */
recipesRouter.get('/suggest-ingredients', async (req: Request, res: Response) => {
  try {
    const query = (req.query.query as string) || '';
    const result = await IngredientResolverService.resolveIngredients(query);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.get('/', optionalAuthenticateToken, async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user as JwtPayload | undefined;
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
    const rows: RecipeRow[] = await db.all(query, effectiveUserId);
    const recipes = await buildRecipesBatch(rows, me?.id, lang);
    res.json(recipes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.get('/saved', authenticateToken, async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const db = await getDB();
    const rows: RecipeRow[] = await db.all(
      `SELECT r.* FROM recipes r JOIN saved_recipes sr ON sr.recipe_id = r.id WHERE sr.user_id = ? ORDER BY sr.created_at DESC`,
      me.id,
    );
    const recipes = await buildRecipesBatch(rows, me.id, lang);
    res.json(recipes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.get('/group', authenticateToken, async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const db = await getDB();

    const membership = await db.get(
      'SELECT group_id FROM group_members WHERE user_id = ? LIMIT 1',
      me.id,
    );
    if (!membership) {
      res.json([]);
      return;
    }

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
    const rows: RecipeRow[] = await db.all(
      `SELECT * FROM recipes WHERE user_id IN (${placeholders}) AND (wip IS NULL OR wip = 0) AND type != 'PRODUCT' ORDER BY name COLLATE NOCASE`,
      ...memberIds,
    );

    const recipes = await buildRecipesBatch(rows, me.id, lang);
    res.json(recipes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.get('/discover', authenticateToken, async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const db = await getDB();
    const rows: RecipeRow[] = await db.all(
      'SELECT * FROM recipes WHERE (wip IS NULL OR wip = 0) ORDER BY created_at DESC LIMIT 50',
    );
    const recipes = await buildRecipesBatch(rows, me.id, lang);
    res.json(recipes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.get('/:id', optionalAuthenticateToken, async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user as JwtPayload | undefined;
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const db = await getDB();
    const row: RecipeRow | undefined = await db.get(
      'SELECT * FROM recipes WHERE id = ?',
      req.params.id,
    );
    if (!row) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
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

recipesRouter.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
    const parsed = recipePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map((e) => e.message).join(', ') });
      return;
    }

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
    } = parsed.data;

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

recipesRouter.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
    const parsed = recipePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map((e) => e.message).join(', ') });
      return;
    }

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
    } = parsed.data;

    const normalizedServings = toMinOne(servings, 4);
    const normalizedMinServings = toMinOne(minServings, 1);
    const normalizedSplitServings = toMinOne(splitServings, 1);
    const db = await getDB();
    const recipeId = req.params.id as string;
    const existing = await db.get(
      'SELECT * FROM recipes WHERE id = ? AND user_id = ?',
      recipeId,
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
      recipeId,
    );
    await saveRecipeDetails(recipeId, ingredients, steps, tags);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

recipesRouter.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
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

recipesRouter.post('/:id/save', authenticateToken, async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
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

recipesRouter.delete('/:id/save', authenticateToken, async (req: Request, res: Response) => {
  try {
    const me = (req as AuthenticatedRequest).user;
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
