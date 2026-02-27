import express from 'express';
import { getDB } from '../db';
import crypto from 'crypto';
const uuidv4 = () => crypto.randomUUID();
import { authenticateToken, JwtPayload } from '../auth.middleware';

export const foodsRouter = express.Router();
foodsRouter.use(authenticateToken);

// ── GET /foods ──────────────────────────────────────
foodsRouter.get('/', async (req: any, res) => {
  try {
    const lang = req.acceptsLanguages('it', 'en') || 'en';
    const db = await getDB();
    const foods = await db.all('SELECT * FROM foods ORDER BY name');
    res.json(
      foods.map(
        (f: {
          id: string;
          name: string;
          name_it?: string;
          default_unit: string;
          kcal: number | null;
          protein: number | null;
          fat: number | null;
          carbs: number | null;
          fiber: number | null;
          portion_value: number | null;
        }) => ({
          id: f.id,
          name: lang === 'it' ? f.name_it || f.name : f.name,
          quantity: { unit: f.default_unit, value: f.portion_value },
          kcal: f.kcal,
          protein: f.protein,
          fat: f.fat,
          carbs: f.carbs,
          fiber: f.fiber,
        }),
      ),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ── POST /foods ─────────────────────────────────────
foodsRouter.post('/', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const { name, defaultUnit, kcal, protein, fat, carbs, fiber, portionValue } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const safeUnit = defaultUnit || 'GRAM';
    const safePortion =
      portionValue || (safeUnit === 'GRAM' || safeUnit === 'MILLILITER' ? 100 : 1);

    const db = await getDB();
    const id = uuidv4();
    await db.run(
      'INSERT INTO foods (id, name, default_unit, created_by, kcal, protein, fat, carbs, fiber, portion_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id,
      name,
      safeUnit,
      me.id,
      kcal ?? null,
      protein ?? null,
      fat ?? null,
      carbs ?? null,
      fiber ?? null,
      safePortion,
    );
    res.json({
      id,
      name,
      quantity: { unit: safeUnit },
      kcal: kcal ?? null,
      protein: protein ?? null,
      fat: fat ?? null,
      carbs: carbs ?? null,
      fiber: fiber ?? null,
      portionValue: safePortion,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
