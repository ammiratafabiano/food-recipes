import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { keyStore, JwtPayload } from './key-store';
import { getDB } from './db';

let io: Server | null = null;

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
}

export function initSocketIO(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:8100',
      credentials: true,
    },
  });

  // Authenticate on connection using the JWT token
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Missing auth token'));
    try {
      const payload = await keyStore.verifyToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;

    // Auto-join the user's group room (if they belong to a group)
    try {
      const db = await getDB();
      const row = await db.get(
        `SELECT g.id FROM groups_table g
         JOIN group_members gm ON gm.group_id = g.id
         WHERE gm.user_id = ? LIMIT 1`,
        user.id,
      );
      if (row) {
        socket.join(`group:${row.id}`);
      }
    } catch {
      // silently ignore – the user simply won't be in a room
    }

    // Allow client to explicitly join/leave a group room
    socket.on('join-group', (groupId: string) => {
      socket.join(`group:${groupId}`);
    });

    socket.on('leave-group', (groupId: string) => {
      socket.leave(`group:${groupId}`);
    });
  });
}

/** Broadcast a planning change to all group members (except sender) */
export function emitPlanningChange(
  groupId: string,
  event: 'planning:added' | 'planning:updated' | 'planning:deleted',
  payload: any,
) {
  if (!io) return;
  io.to(`group:${groupId}`).emit(event, payload);
}

/** Broadcast a shopping-list invalidation to all group members */
export function emitShoppingListInvalidate(groupId: string, week: string) {
  if (!io) return;
  io.to(`group:${groupId}`).emit('shopping-list:invalidate', { week });
}
