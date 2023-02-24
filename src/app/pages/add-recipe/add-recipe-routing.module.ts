import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddRecipePage } from './add-recipe.page';

const routes: Routes = [
  {
    path: '',
    component: AddRecipePage
  },
  {
    path: 'ingredient-selection',
    loadChildren: () => import('../ingredient-selection/ingredient-selection.module').then( m => m.IngredientSelectionPageModule)
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddRecipePageRoutingModule {}
