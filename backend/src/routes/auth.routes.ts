import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { getDB } from '../db';
import crypto from 'crypto';
const uuidv4 = () => crypto.randomUUID();
import { signToken, signRefreshToken, authenticateToken, JwtPayload } from '../auth.middleware';
import { keyStore } from '../key-store';
import dotenv from 'dotenv';

dotenv.config();

export const authRouter = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

authRouter.post('/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    res.status(400).json({ error: 'idToken is required' });
    return;
  }
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: 'Invalid Google token' });
      return;
    }

    const { sub: googleId, email, name, picture } = payload;
    const db = await getDB();

    let user = await db.get(
      'SELECT * FROM users WHERE google_id = ? OR email = ?',
      googleId,
      email,
    );

    if (!user) {
      const id = uuidv4();
      await db.run(
        'INSERT INTO users (id, name, email, avatar_url, google_id) VALUES (?, ?, ?, ?, ?)',
        id,
        name || email!.split('@')[0],
        email,
        picture || '',
        googleId,
      );
      user = { id, name: name || email!.split('@')[0], email, avatar_url: picture || '' };
    } else if (!user.google_id) {
      await db.run(
        "UPDATE users SET google_id = ?, avatar_url = COALESCE(NULLIF(avatar_url, ''), ?) WHERE id = ?",
        googleId,
        picture || '',
        user.id,
      );
      user.avatar_url = user.avatar_url || picture || '';
    }

    const token = await signToken({ id: user.id, name: user.name, email: user.email });
    const refreshToken = await signRefreshToken({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    res.json({
      token,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url || '' },
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed: ' + (err.message || '') });
  }
});

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(401).json({ error: 'Missing refresh token' });
    return;
  }

  try {
    const payload = await keyStore.verifyToken(refreshToken);
    const newToken = await signToken({ id: payload.id, name: payload.name, email: payload.email });
    const newRefreshToken = await signRefreshToken({
      id: payload.id,
      name: payload.name,
      email: payload.email,
    });
    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch {
    res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
});

authRouter.get('/me', authenticateToken, async (req, res) => {
  try {
    const { id } = (req as any).user as JwtPayload;
    const db = await getDB();
    const user = await db.get('SELECT id, name, email, avatar_url FROM users WHERE id = ?', id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

authRouter.delete('/me', authenticateToken, async (req, res) => {
  try {
    const { id } = (req as any).user as JwtPayload;
    const db = await getDB();
    await db.run('DELETE FROM users WHERE id = ?', id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});
