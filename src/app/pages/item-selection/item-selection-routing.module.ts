import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ItemSelectionPage } from './item-selection.page';

const routes: Routes = [
  {
    path: '',
    component: ItemSelectionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ItemSelectionPageRoutingModule {}
