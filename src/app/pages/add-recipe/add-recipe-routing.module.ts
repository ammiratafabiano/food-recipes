import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AddRecipeNavigationPath } from 'src/app/models/navigation-path.enum';

import { AddRecipePage } from './add-recipe.page';

const routes: Routes = [
  {
    path: AddRecipeNavigationPath.Base,
    component: AddRecipePage
  },
  {
    path: AddRecipeNavigationPath.ItemSelection,
    loadChildren: () => import('../item-selection/item-selection.module').then( m => m.ItemSelectionPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AddRecipePageRoutingModule {}
