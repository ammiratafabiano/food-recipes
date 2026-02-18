import { Routes } from '@angular/router';
import { UserNavigationPath } from 'src/app/models/navigation-path.enum';
import { UserPage } from './user.page';

export const USER_ROUTES: Routes = [
  {
    path: UserNavigationPath.Base,
    component: UserPage,
  },
  {
    path: UserNavigationPath.Recipe,
    loadComponent: () =>
      import('../recipe/recipe.page').then((m) => m.RecipePage),
  },
];
