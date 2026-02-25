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
      foods.map((f: any) => ({
        id: f.id,
        name: f.name,
        quantity: { unit: f.default_unit },
      })),
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /foods ─────────────────────────────────────
foodsRouter.post('/', async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
