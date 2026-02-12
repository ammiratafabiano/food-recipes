import { Injectable, signal } from '@angular/core';
import { Ingredient } from '../models/ingredient.model';
import { UserData } from '../models/user-data.model';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly SESSION_USER_KEY = 'sessionUser';
  private readonly LOGIN_REDIRECT_KEY = 'loginRedirect';

  readonly foodList = signal<Ingredient[] | undefined>(undefined);
  readonly storedUser = signal<UserData | undefined>(this.getInitialUser());
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

  setLoginRedirect(v: string | undefined) {
    this.loginRedirect.set(v);
    this.setStorage(this.LOGIN_REDIRECT_KEY, v);
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
    if (
      valueToRet !== 'undefined' &&
      valueToRet !== undefined &&
      valueToRet !== ''
    ) {
      return valueToRet;
    } else {
      return undefined;
    }
  }
}
