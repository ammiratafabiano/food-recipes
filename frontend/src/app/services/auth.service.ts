import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom, Observable } from 'rxjs';
import { UserData } from '../models/user-data.model';
import { SessionService } from './session.service';
import { environment } from '../../environments/environment';

export interface AuthError {
  message: string;
}

export interface AuthResponse<T = { user: UserData }> {
  data: T;
  error: AuthError | null;
}

declare const google: {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
        use_fedcm_for_prompt?: boolean;
      }) => void;
      prompt: (
        callback: (notification: {
          isNotDisplayed: () => boolean;
          isSkippedMoment: () => boolean;
          isDismissedMoment: () => boolean;
          getNotDisplayedReason?: () => string;
          getSkippedReason?: () => string;
          getDismissedReason?: () => string;
        }) => void,
      ) => void;
      renderButton: (
        element: HTMLElement | null,
        config: { theme: string; size: string; shape: string; text: string },
      ) => void;
    };
  };
}; // Google Identity Services global

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionService = inject(SessionService);
  private readonly apiUrl = environment.apiUrl;

  readonly currentUser = signal<UserData | 0 | undefined>(undefined);

  constructor() {
    this.loadUser();
  }

  /** Restore session from localStorage or validate token via /auth/me */
  async loadUser() {
    if (this.currentUser()) return;
    const token = this.sessionService.token();
    const refreshToken = this.sessionService.refreshToken();
    const storedUser = this.sessionService.storedUser();

    if (token && storedUser) {
      // Quick restore – optionally validate token
      this.currentUser.set(storedUser);
      try {
        const freshUser = await firstValueFrom(this.http.get<UserData>(`${this.apiUrl}/auth/me`));
        this.currentUser.set(freshUser);
        this.sessionService.setStoredUser(freshUser);
      } catch {
        // Token expired – try to refresh
        if (refreshToken) {
          try {
            const res = await firstValueFrom(
              this.http.post<{ token: string; refreshToken: string }>(
                `${this.apiUrl}/auth/refresh`,
                { refreshToken },
              ),
            );
            this.sessionService.setToken(res.token);
            this.sessionService.setRefreshToken(res.refreshToken);

            // Retry getting user data
            const freshUser = await firstValueFrom(
              this.http.get<UserData>(`${this.apiUrl}/auth/me`),
            );
            this.currentUser.set(freshUser);
            this.sessionService.setStoredUser(freshUser);
            return;
          } catch (refreshErr) {
            // Refresh failed
            this.sessionService.clearSession();
            this.currentUser.set(0);
          }
        } else {
          this.sessionService.clearSession();
          this.currentUser.set(0);
        }
      }
      return;
    }
    this.currentUser.set(0);
  }

  getCurrentUserAsync(): Observable<UserData | 0 | undefined> {
    return toObservable(this.currentUser);
  }

  getCurrentUser(): UserData | undefined {
    const value = this.currentUser();
    return value !== 0 && value !== undefined ? value : undefined;
  }

  // ── Google Sign In ────────────────────────────────

  async signInWithGoogle(idToken: string): Promise<AuthResponse> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ token: string; refreshToken: string; user: UserData }>(
          `${this.apiUrl}/auth/google`,
          { idToken },
        ),
      );
      this.handleAuthSuccess(res.token, res.refreshToken, res.user);
      return { data: { user: res.user }, error: null };
    } catch (err: unknown) {
      return {
        data: { user: {} as UserData },
        error: {
          message: err instanceof Error ? err.message : 'Google sign in failed',
        },
      };
    }
  }

  /**
   * Initialise GSI and try the One Tap automatic prompt.
   * Returns a promise that resolves with the credential on success,
   * or rejects if the user dismisses / the browser blocks the prompt.
   */
  promptGoogleOneTap(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.accounts) {
        reject(new Error('GSI SDK not loaded'));
        return;
      }

      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        use_fedcm_for_prompt: true,
        callback: (response: { credential?: string }) => {
          if (response.credential) {
            resolve(response.credential);
          } else {
            reject(new Error('No credential in response'));
          }
        },
      });

      google.accounts.id.prompt(
        (notification: {
          isNotDisplayed: () => boolean;
          isSkippedMoment: () => boolean;
          isDismissedMoment: () => boolean;
          getNotDisplayedReason?: () => string;
          getSkippedReason?: () => string;
          getDismissedReason?: () => string;
        }) => {
          // If the One Tap UI is dismissed or not displayed, reject
          if (
            notification.isNotDisplayed() ||
            notification.isSkippedMoment() ||
            notification.isDismissedMoment()
          ) {
            reject(
              new Error(
                notification.getNotDisplayedReason?.() ||
                  notification.getSkippedReason?.() ||
                  notification.getDismissedReason?.() ||
                  'prompt_dismissed',
              ),
            );
          }
        },
      );
    });
  }

  /** Render the Google Sign-In button as a visible fallback */
  renderGoogleButton(
    elementId: string,
    callback: (response: { credential?: string }) => void,
  ): void {
    if (typeof google === 'undefined' || !google.accounts) {
      console.error('Google Identity Services SDK not loaded. Add the script to index.html.');
      return;
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      use_fedcm_for_prompt: true,
      callback: callback,
    });

    const btnElement = document.getElementById(elementId);
    if (btnElement) {
      google.accounts.id.renderButton(btnElement, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'signin_with',
      });
    } else {
      console.error(`Element with id ${elementId} not found.`);
    }
  }

  // ── Session helpers ───────────────────────────────

  private handleAuthSuccess(token: string, refreshToken: string, user: UserData) {
    this.sessionService.setToken(token);
    this.sessionService.setRefreshToken(refreshToken);
    this.sessionService.setStoredUser(user);
    this.currentUser.set(user);
  }

  resetUser() {
    this.sessionService.clearSession();
    this.currentUser.set(undefined);
  }

  signOut(): Promise<void> {
    this.resetUser();
    return Promise.resolve();
  }
}
