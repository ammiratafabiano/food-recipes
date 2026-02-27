import express from 'express';
import { getDB } from '../db';
import { authenticateToken, JwtPayload } from '../auth.middleware';

export const usersRouter = express.Router();
usersRouter.use(authenticateToken);

usersRouter.get('/', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const db = await getDB();
    const users = await db.all(
      'SELECT id, name, email, avatar_url FROM users WHERE id != ?',
      me.id,
    );
    res.json(users);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

usersRouter.get('/:id', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const db = await getDB();
    const user = await db.get(
      'SELECT id, name, email, avatar_url FROM users WHERE id = ?',
      req.params.id,
    );
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const followed = await db.get(
      'SELECT 1 FROM followers WHERE follower_id = ? AND followed_id = ?',
      me.id,
      req.params.id,
    );
    user.isFollowed = !!followed;
    res.json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

usersRouter.get('/:id/stats', async (req: any, res) => {
  try {
    const db = await getDB();
    const userId = req.params.id;
    const saved = await db.get('SELECT COUNT(*) as c FROM saved_recipes WHERE user_id = ?', userId);
    const followers = await db.get(
      'SELECT COUNT(*) as c FROM followers WHERE followed_id = ?',
      userId,
    );
    const followed = await db.get(
      'SELECT COUNT(*) as c FROM followers WHERE follower_id = ?',
      userId,
    );
    res.json({
      saved: saved?.c || 0,
      followers: followers?.c || 0,
      followed: followed?.c || 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

usersRouter.post('/:id/follow', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const db = await getDB();
    await db.run(
      'INSERT OR IGNORE INTO followers (follower_id, followed_id) VALUES (?, ?)',
      me.id,
      req.params.id,
    );
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

usersRouter.delete('/:id/follow', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const db = await getDB();
    await db.run(
      'DELETE FROM followers WHERE follower_id = ? AND followed_id = ?',
      me.id,
      req.params.id,
    );
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
