import express from 'express';
import { getDB } from '../db';
import crypto from 'crypto';
const uuidv4 = () => crypto.randomUUID();
import { authenticateToken, JwtPayload } from '../auth.middleware';
import { emitGroupMembershipChanged } from '../socket';

export const groupsRouter = express.Router();
groupsRouter.use(authenticateToken);

groupsRouter.get('/mine', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const db = await getDB();
    const row = await db.get(
      `SELECT g.id FROM groups_table g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = ? LIMIT 1`,
      me.id,
    );
    if (!row) {
      res.json(null);
      return;
    }
    const members = await db.all('SELECT user_id FROM group_members WHERE group_id = ?', row.id);
    res.json({ id: row.id, users: members.map((m: { user_id: string }) => m.user_id) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

groupsRouter.get('/:id', async (req: any, res) => {
  try {
    const db = await getDB();
    const row = await db.get(
      `SELECT g.id FROM groups_table g JOIN group_members gm ON gm.group_id = g.id WHERE g.id = ? LIMIT 1`,
      req.params.id,
    );
    if (!row) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }
    const members = await db.all('SELECT user_id FROM group_members WHERE group_id = ?', row.id);
    res.json({ id: row.id, users: members.map((m: { user_id: string }) => m.user_id) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

groupsRouter.post('/', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const db = await getDB();

    // If user is already in a group, leave it first
    const existingGroup = await db.get(
      'SELECT group_id FROM group_members WHERE user_id = ?',
      me.id,
    );
    if (existingGroup) {
      const oldGroupId = existingGroup.group_id;
      const oldMembers = await db.all(
        'SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?',
        oldGroupId,
        me.id,
      );
      const oldRemainingIds = oldMembers.map((m: { user_id: string }) => m.user_id);

      for (const otherId of oldRemainingIds) {
        await db.run(
          'DELETE FROM followers WHERE follower_id = ? AND followed_id = ?',
          me.id,
          otherId,
        );
        await db.run(
          'DELETE FROM followers WHERE follower_id = ? AND followed_id = ?',
          otherId,
          me.id,
        );
      }

      await db.run(
        'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
        oldGroupId,
        me.id,
      );

      if (oldRemainingIds.length === 0) {
        await db.run('DELETE FROM groups_table WHERE id = ?', oldGroupId);
      }

      emitGroupMembershipChanged(oldGroupId, oldRemainingIds);
    }

    const id = uuidv4();
    await db.run('INSERT INTO groups_table (id) VALUES (?)', id);
    await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', id, me.id);
    res.json({ id, users: [me.id] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

groupsRouter.post('/:id/join', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const db = await getDB();

    // Verify the group exists and has at least one member
    const groupExists = await db.get(
      'SELECT 1 FROM groups_table g JOIN group_members gm ON gm.group_id = g.id WHERE g.id = ? LIMIT 1',
      req.params.id,
    );
    if (!groupExists) {
      res.status(404).json({ error: 'Group not found or empty' });
      return;
    }

    // If user is already in another group, leave it first
    const existingGroup = await db.get(
      'SELECT group_id FROM group_members WHERE user_id = ?',
      me.id,
    );
    if (existingGroup && existingGroup.group_id !== req.params.id) {
      const oldGroupId = existingGroup.group_id;

      // Get remaining members of old group
      const oldMembers = await db.all(
        'SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?',
        oldGroupId,
        me.id,
      );
      const oldRemainingIds = oldMembers.map((m: { user_id: string }) => m.user_id);

      // Remove follow relationships with old group members
      for (const otherId of oldRemainingIds) {
        await db.run(
          'DELETE FROM followers WHERE follower_id = ? AND followed_id = ?',
          me.id,
          otherId,
        );
        await db.run(
          'DELETE FROM followers WHERE follower_id = ? AND followed_id = ?',
          otherId,
          me.id,
        );
      }

      await db.run(
        'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
        oldGroupId,
        me.id,
      );

      // Clean up empty old group
      if (oldRemainingIds.length === 0) {
        await db.run('DELETE FROM groups_table WHERE id = ?', oldGroupId);
      }

      emitGroupMembershipChanged(oldGroupId, oldRemainingIds);
    }

    await db.run(
      'INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)',
      req.params.id,
      me.id,
    );

    // Auto-enable planning for users joining a group
    await db.run('UPDATE users SET planning_enabled = 1 WHERE id = ?', me.id);

    const members = await db.all(
      'SELECT user_id FROM group_members WHERE group_id = ?',
      req.params.id,
    );
    const userIds = members.map((m: { user_id: string }) => m.user_id);

    // Auto-follow: create bidirectional follow between new member and all existing members
    const otherIds = userIds.filter((id: string) => id !== me.id);
    for (const otherId of otherIds) {
      await db.run(
        'INSERT OR IGNORE INTO followers (follower_id, followed_id) VALUES (?, ?)',
        me.id,
        otherId,
      );
      await db.run(
        'INSERT OR IGNORE INTO followers (follower_id, followed_id) VALUES (?, ?)',
        otherId,
        me.id,
      );
    }

    emitGroupMembershipChanged(req.params.id, userIds);
    res.json({ id: req.params.id, users: userIds });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

groupsRouter.post('/:id/leave', async (req: any, res) => {
  try {
    const me = req.user as JwtPayload;
    const db = await getDB();

    // Get remaining members before removing
    const membersBefore = await db.all(
      'SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?',
      req.params.id,
      me.id,
    );
    const remainingIds = membersBefore.map((m: { user_id: string }) => m.user_id);

    // Remove follow relationships between leaving user and remaining group members
    for (const otherId of remainingIds) {
      await db.run(
        'DELETE FROM followers WHERE follower_id = ? AND followed_id = ?',
        me.id,
        otherId,
      );
      await db.run(
        'DELETE FROM followers WHERE follower_id = ? AND followed_id = ?',
        otherId,
        me.id,
      );
    }

    await db.run(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      req.params.id,
      me.id,
    );

    // Clean up empty group if no members remain
    if (remainingIds.length === 0) {
      await db.run('DELETE FROM groups_table WHERE id = ?', req.params.id);
    }

    emitGroupMembershipChanged(req.params.id, remainingIds);
    res.json({ id: req.params.id, users: remainingIds });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
