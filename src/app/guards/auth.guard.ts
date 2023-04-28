import { AuthService } from './../services/auth.service'
import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router'
import { Observable } from 'rxjs'
import { debounceTime, map, take } from 'rxjs/operators'
import { SessionService } from '../services/session.service'

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly sessionService: SessionService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return this.auth.getCurrentUserAsync().pipe(
      debounceTime(500),
      map((isAuthenticated) => {
        if (isAuthenticated) {
          return true;
        } else {
          this.sessionService.loginRedirect = state.url;
          return this.router.createUrlTree(['/login']);
        }
      }),
      take(1)
    )
  }
}
