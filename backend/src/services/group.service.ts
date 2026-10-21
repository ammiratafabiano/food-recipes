import { getDB } from '../db';

export class GroupService {
  /**
   * Finds the group_id for a given user, or null if they don't belong to any group.
   */
  static async findUserGroupId(userId: string): Promise<string | null> {
    const db = await getDB();
    const row = await db.get<{ group_id: string }>(
      'SELECT group_id FROM group_members WHERE user_id = ?',
      userId,
    );
    return row?.group_id || null;
  }

  /**
   * Retrieves all member user IDs for a given group.
   */
  static async getGroupMemberUserIds(groupId: string): Promise<string[]> {
    const db = await getDB();
    const members = await db.all<{ user_id: string }[]>(
      'SELECT user_id FROM group_members WHERE group_id = ?',
      groupId,
    );
    return members.map((m) => m.user_id);
  }

  /**
   * Checks whether two users share at least one group.
   */
  static async areUsersInSameGroup(userIdA: string, userIdB: string): Promise<boolean> {
    if (userIdA === userIdB) return true;
    const db = await getDB();
    const row = await db.get(
      `SELECT 1 FROM group_members gm1
       JOIN group_members gm2 ON gm1.group_id = gm2.group_id
       WHERE gm1.user_id = ? AND gm2.user_id = ?`,
      userIdA,
      userIdB,
    );
    return !!row;
  }
}
