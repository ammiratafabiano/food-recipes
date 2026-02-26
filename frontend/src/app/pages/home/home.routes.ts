import { Routes } from '@angular/router';
import { HomeNavigationPath } from 'src/app/models/navigation-path.enum';
import { HomePage } from './home.page';

export const HOME_ROUTES: Routes = [
  {
    path: HomeNavigationPath.Base,
    component: HomePage,
    children: [
      {
        path: HomeNavigationPath.Discover,
        loadComponent: () => import('../discover/discover.page').then((m) => m.DiscoverPage),
      },
      {
        path: HomeNavigationPath.RecipeList,
        loadChildren: () =>
          import('../recipe-list/recipe-list.routes').then((m) => m.RECIPE_LIST_ROUTES),
      },
      {
        path: HomeNavigationPath.Planning,
        loadComponent: () => import('../planning/planning.page').then((m) => m.PlanningPage),
      },
      {
        path: HomeNavigationPath.ShoppingList,
        loadComponent: () =>
          import('../shopping-list/shopping-list.page').then((m) => m.ShoppingListPage),
      },
      {
        path: HomeNavigationPath.Settings,
        loadChildren: () => import('../settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      {
        path: '',
        redirectTo: HomeNavigationPath.RecipeList,
        pathMatch: 'full',
      },
    ],
  },
];
