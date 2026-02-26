import express from 'express';
import { getDB } from '../db';
import crypto from 'crypto';
const uuidv4 = () => crypto.randomUUID();
import { authenticateToken, JwtPayload } from '../auth.middleware';

export const foodsRouter = express.Router();
foodsRouter.use(authenticateToken);

// ── GET /foods ──────────────────────────────────────
foodsRouter.get('/', async (req, res) => {
  try {
    const db = await getDB();
    const foods = await db.all('SELECT * FROM foods ORDER BY name');
    res.json(
      foods.map((f: { id: string; name: string; default_unit: string }) => ({
        id: f.id,
        name: f.name,
        quantity: { unit: f.default_unit },
      })),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ── POST /foods ─────────────────────────────────────
foodsRouter.post('/', async (req, res) => {
  try {
    const me = req.user as JwtPayload;
    const { name, defaultUnit } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const db = await getDB();
    const id = uuidv4();
    await db.run(
      'INSERT INTO foods (id, name, default_unit, created_by) VALUES (?, ?, ?, ?)',
      id,
      name,
      defaultUnit || 'GRAM',
      me.id,
    );
    res.json({ id, name, quantity: { unit: defaultUnit || 'GRAM' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
