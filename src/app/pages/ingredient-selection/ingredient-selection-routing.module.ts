import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { IngredientSelectionPage } from './ingredient-selection.page';

const routes: Routes = [
  {
    path: '',
    component: IngredientSelectionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class IngredientSelectionPageRoutingModule {}
