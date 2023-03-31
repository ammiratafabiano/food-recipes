import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AddRecipePage } from './add-recipe.page';

const routes: Routes = [
  {
    path: '',
    component: AddRecipePage
  },
  {
    path: 'item-selection',
    loadChildren: () => import('../item-selection/item-selection.module').then( m => m.ItemSelectionPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddRecipePageRoutingModule {}
