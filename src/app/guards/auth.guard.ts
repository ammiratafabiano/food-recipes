import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { debounceTime, map, take } from 'rxjs/operators';
import { AuthService } from './../services/auth.service';
import { SessionService } from '../services/session.service';

export const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const sessionService = inject(SessionService);

  return auth.getCurrentUserAsync().pipe(
    debounceTime(500),
    map((isAuthenticated) => {
      if (isAuthenticated) {
        return true;
      } else {
        sessionService.setLoginRedirect(router.routerState.snapshot.url);
        return router.createUrlTree(['/login']);
      }
    }),
    take(1),
  );
};
