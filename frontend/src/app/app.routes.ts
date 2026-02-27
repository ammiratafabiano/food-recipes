import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { NavigationPath } from './models/navigation-path.enum';

export const routes: Routes = [
  {
    path: NavigationPath.Base,
    redirectTo: NavigationPath.Home,
    pathMatch: 'full',
  },
  {
    path: NavigationPath.Login,
    loadChildren: () => import('./pages/login/login.routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: NavigationPath.Home,
    loadChildren: () => import('./pages/home/home.routes').then((m) => m.HOME_ROUTES),
    canActivate: [authGuard],
  },
  {
    path: NavigationPath.NotFound,
    loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
  {
    path: NavigationPath.Recipe,
    loadComponent: () => import('./pages/recipe/recipe.page').then((m) => m.RecipePage),
  },
  {
    path: NavigationPath.ItemSelection,
    loadComponent: () =>
      import('./pages/item-selection/item-selection.page').then((m) => m.ItemSelectionPage),
  },
  {
    path: NavigationPath.User,
    loadChildren: () => import('./pages/user/user.routes').then((m) => m.USER_ROUTES),
  },
  {
    path: '**',
    redirectTo: NavigationPath.NotFound,
  },
];
