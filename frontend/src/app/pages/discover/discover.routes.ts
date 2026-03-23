import { Routes } from '@angular/router';

export const DISCOVER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./discover.page').then((m) => m.DiscoverPage),
  },
  {
    path: 'user',
    loadChildren: () => import('../user/user.routes').then((m) => m.USER_ROUTES),
  },
];
