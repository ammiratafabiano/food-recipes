import { Injectable } from '@angular/core';
import { UserData } from '../models/user-data.model';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  private _userData: UserData | undefined;
  public get userData(): UserData | undefined {
    return this._userData;
  }
  public set userData(v: UserData | undefined) {
    this._userData = v;
  }

  
  public get loginRedirect(): string | null | undefined {
    return this.getStorage("loginRedirect");
  }
  public set loginRedirect(v: string | null | undefined) {
    this.setStorage("loginRedirect", v);
  }
  

  constructor() { }

  private setStorage(key: string, value: any) {
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
