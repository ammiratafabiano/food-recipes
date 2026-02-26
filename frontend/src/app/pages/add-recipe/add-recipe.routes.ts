import { Routes } from '@angular/router';
import { AddRecipeNavigationPath } from 'src/app/models/navigation-path.enum';
import { AddRecipePage } from './add-recipe.page';

export const ADD_RECIPE_ROUTES: Routes = [
  {
    path: AddRecipeNavigationPath.Base,
    component: AddRecipePage,
  },
  {
    path: AddRecipeNavigationPath.ItemSelection,
    loadComponent: () =>
      import('../item-selection/item-selection.page').then((m) => m.ItemSelectionPage),
  },
];
