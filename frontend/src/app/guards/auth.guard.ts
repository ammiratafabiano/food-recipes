import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from './../services/auth.service';
import { SessionService } from '../services/session.service';
import { UserData } from '../models/user-data.model';

export const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const sessionService = inject(SessionService);

  return auth.getCurrentUserAsync().pipe(
    // Skip undefined (still loading), only decide when we know the state
    filter((user): user is UserData | 0 => user !== undefined),
    take(1),
    map((user) => {
      if (user !== 0) {
        return true;
      } else {
        const currentUrl = router.routerState.snapshot.url;
        sessionService.setLoginRedirect(currentUrl);

        // Preserve ?group= query param so the login page can handle group invites
        const urlTree = router.parseUrl(currentUrl);
        const groupId = urlTree.queryParams['group'];
        if (groupId) {
          sessionService.setPendingGroupId(groupId);
        }

        return router.createUrlTree(['/login']);
      }
    }),
  );
};
