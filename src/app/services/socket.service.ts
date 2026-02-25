import { effect, inject, Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { SessionService } from './session.service';
import { environment } from '../../environments/environment';

export interface PlanningChangeEvent {
  type: 'added' | 'updated' | 'deleted';
  payload: any;
}

export interface ShoppingListInvalidateEvent {
  week: string;
}

/**
 * Singleton service that manages a SINGLE Socket.IO connection.
 * - Call `ensureConnected(groupId)` to lazily open / switch group.
 * - Call `disconnect()` to tear down.
 * - Subscribe to `planningChanges` / `shoppingListInvalidate` at any time;
 *   events will arrive once the socket is connected.
 */
@Injectable({
  providedIn: 'root',
})
export class SocketService implements OnDestroy {
  private readonly sessionService = inject(SessionService);

  private socket: Socket | null = null;
  private currentGroupId: string | null = null;

  private readonly planningChanges$ = new Subject<PlanningChangeEvent>();
  private readonly shoppingListInvalidate$ = new Subject<ShoppingListInvalidateEvent>();

  constructor() {
    // Auto-disconnect when the user logs out (token becomes undefined)
    effect(() => {
      const token = this.sessionService.token();
      if (!token && this.socket) {
        this.disconnect();
      }
    });
  }

  /** Observable of planning changes (add/update/delete) */
  get planningChanges(): Observable<PlanningChangeEvent> {
    return this.planningChanges$.asObservable();
  }

  /** Observable of shopping-list invalidation events */
  get shoppingListInvalidate(): Observable<ShoppingListInvalidateEvent> {
    return this.shoppingListInvalidate$.asObservable();
  }

  /**
   * Ensure there is exactly one open socket for the given group.
   * - If already connected to the same group → no-op.
   * - If connected to a different group → switch room (no reconnect).
   * - If not connected → open a new socket.
   */
  ensureConnected(groupId: string) {
    const token = this.sessionService.token();
    if (!token) return;

    // Already connected to the same group – nothing to do
    if (this.socket && this.currentGroupId === groupId) {
      return;
    }

    // Same socket but different group → just switch rooms
    if (this.socket && this.currentGroupId && this.currentGroupId !== groupId) {
      this.socket.emit('leave-group', this.currentGroupId);
      this.socket.emit('join-group', groupId);
      this.currentGroupId = groupId;
      return;
    }

    // No socket yet → create one (WebSocket only — no HTTP polling)
    this.socket = io(environment.apiUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      upgrade: false,
    });

    this.currentGroupId = groupId;

    this.socket.on('connect', () => {
      if (this.currentGroupId) {
        this.socket?.emit('join-group', this.currentGroupId);
      }
    });

    this.socket.on('planning:added', (data: any) =>
      this.planningChanges$.next({ type: 'added', payload: data }),
    );
    this.socket.on('planning:updated', (data: any) =>
      this.planningChanges$.next({ type: 'updated', payload: data }),
    );
    this.socket.on('planning:deleted', (data: any) =>
      this.planningChanges$.next({ type: 'deleted', payload: data }),
    );
    this.socket.on('shopping-list:invalidate', (data: any) =>
      this.shoppingListInvalidate$.next(data),
    );

    this.socket.on('connect_error', (err) => {
      console.warn('Socket.IO connection error:', err.message);
    });
  }

  /** Tear down the socket completely */
  disconnect() {
    if (this.socket) {
      if (this.currentGroupId) {
        this.socket.emit('leave-group', this.currentGroupId);
      }
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.currentGroupId = null;
    }
  }

  /** Whether the socket is currently connected */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  ngOnDestroy() {
    this.disconnect();
    this.planningChanges$.complete();
    this.shoppingListInvalidate$.complete();
  }
}
