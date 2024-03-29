import { Injectable } from '@angular/core';
import { Ingredient } from '../models/ingredient.model';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  private _foodList: Ingredient[] | undefined;
  public get foodList(): Ingredient[] | undefined {
    return this._foodList;
  }
  public set foodList(v: Ingredient[] | undefined) {
    this._foodList = v;
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
