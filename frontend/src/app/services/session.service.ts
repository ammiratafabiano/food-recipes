import { Injectable, signal } from '@angular/core';
import { Ingredient } from '../models/ingredient.model';
import { UserData } from '../models/user-data.model';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly SESSION_USER_KEY = 'sessionUser';
  private readonly SESSION_TOKEN_KEY = 'sessionToken';
  private readonly SESSION_REFRESH_TOKEN_KEY = 'sessionRefreshToken';
  private readonly LOGIN_REDIRECT_KEY = 'loginRedirect';

  readonly foodList = signal<Ingredient[] | undefined>(undefined);
  readonly storedUser = signal<UserData | undefined>(this.getInitialUser());
  readonly token = signal<string | undefined>(this.getStorage(this.SESSION_TOKEN_KEY) ?? undefined);
  readonly refreshToken = signal<string | undefined>(
    this.getStorage(this.SESSION_REFRESH_TOKEN_KEY) ?? undefined,
  );
  readonly loginRedirect = signal<string | undefined>(
    this.getStorage(this.LOGIN_REDIRECT_KEY) ?? undefined,
  );

  constructor() {}

  private getInitialUser(): UserData | undefined {
    const raw = this.getStorage(this.SESSION_USER_KEY);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as UserData;
    } catch {
      return undefined;
    }
  }

  setFoodList(v: Ingredient[] | undefined) {
    this.foodList.set(v);
  }

  setStoredUser(v: UserData | undefined) {
    this.storedUser.set(v);
    this.setStorage(this.SESSION_USER_KEY, v ? JSON.stringify(v) : undefined);
  }

  setToken(v: string | undefined) {
    this.token.set(v);
    this.setStorage(this.SESSION_TOKEN_KEY, v);
  }

  setRefreshToken(v: string | undefined) {
    this.refreshToken.set(v);
    this.setStorage(this.SESSION_REFRESH_TOKEN_KEY, v);
  }

  setLoginRedirect(v: string | undefined) {
    this.loginRedirect.set(v);
    this.setStorage(this.LOGIN_REDIRECT_KEY, v);
  }

  clearSession() {
    this.setStoredUser(undefined);
    this.setToken(undefined);
    this.setRefreshToken(undefined);
    this.setFoodList(undefined);
  }

  private setStorage(key: string, value: string | null | undefined) {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, value);
  }

  private getStorage(key: string) {
    const valueToRet = window.localStorage.getItem(key);
    if (valueToRet !== 'undefined' && valueToRet !== undefined && valueToRet !== '') {
      return valueToRet;
    } else {
      return undefined;
    }
  }
}
