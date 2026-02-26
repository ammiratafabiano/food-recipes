import { Routes } from '@angular/router';
import { RecipeListNavigationPath } from 'src/app/models/navigation-path.enum';
import { RecipeListPage } from './recipe-list.page';

export const RECIPE_LIST_ROUTES: Routes = [
  {
    path: RecipeListNavigationPath.Base,
    component: RecipeListPage,
  },
  {
    path: RecipeListNavigationPath.Recipe,
    loadComponent: () => import('../recipe/recipe.page').then((m) => m.RecipePage),
  },
  {
    path: RecipeListNavigationPath.AddRecipe,
    loadChildren: () => import('../add-recipe/add-recipe.routes').then((m) => m.ADD_RECIPE_ROUTES),
  },
];
