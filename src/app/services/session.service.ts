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

  constructor() { }
}
