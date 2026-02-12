import { inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { UserData } from '../models/user-data.model';
import { SessionService } from './session.service';

export interface AuthError {
  message: string;
}

export interface AuthResponse<T = { user: UserData }> {
  data: T;
  error: AuthError | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly sessionService = inject(SessionService);

  readonly currentUser = signal<UserData | 0 | undefined>(undefined);

  private readonly mockUser: UserData = {
    id: 'user1',
    name: 'Chef Mario',
    email: 'mario@chef.com',
    avatar_url: 'https://example.com/mario.jpg',
  };

  constructor() {
    // Trigger initial session load (no remote auth provider)
    this.loadUser();
  }

  async loadUser() {
    if (this.currentUser()) return;
    const storedUser = this.sessionService.storedUser();
    if (storedUser) {
      this.currentUser.set(storedUser);
      return;
    }
    // Mimic "not authenticated" state on startup
    this.currentUser.set(0);
  }

  getCurrentUserAsync(): Observable<UserData | 0 | undefined> {
    return toObservable(this.currentUser);
  }

  getCurrentUser(): UserData | undefined {
    const value = this.currentUser();
    return value !== 0 && value !== undefined ? value : undefined;
  }

  signUp(credentials: { email: string; password: string }) {
    // Simulate successful sign up
    return Promise.resolve({
      data: { user: this.mockUser },
      error: null,
    } as AuthResponse);
  }

  signIn(credentials: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    this.currentUser.set(this.mockUser);
    this.sessionService.setStoredUser(this.mockUser);
    return Promise.resolve({ data: { user: this.mockUser }, error: null });
  }

  signInWithEmail(email: string): Promise<AuthResponse> {
    this.currentUser.set(this.mockUser);
    this.sessionService.setStoredUser(this.mockUser);
    return Promise.resolve({ data: { user: this.mockUser }, error: null });
  }

  signInWithFacebook(): Promise<AuthResponse> {
    this.currentUser.set(this.mockUser);
    this.sessionService.setStoredUser(this.mockUser);
    return Promise.resolve({ data: { user: this.mockUser }, error: null });
  }

  signInWithGoogle(): Promise<AuthResponse> {
    this.currentUser.set(this.mockUser);
    this.sessionService.setStoredUser(this.mockUser);
    return Promise.resolve({ data: { user: this.mockUser }, error: null });
  }

  sendPwReset(email: string): Promise<AuthResponse<{}>> {
    return Promise.resolve({ data: {}, error: null });
  }

  resetUser() {
    this.sessionService.setStoredUser(undefined);
    this.currentUser.set(undefined);
  }

  signOut(): Promise<void> {
    this.resetUser();
    return Promise.resolve();
  }
}
