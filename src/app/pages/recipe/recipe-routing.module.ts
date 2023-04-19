import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RecipeNavigationPath } from 'src/app/models/navigation-path.enum';

import { RecipePage } from './recipe.page';

const routes: Routes = [
  {
    path: RecipeNavigationPath.Base,
    component: RecipePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RecipePageRoutingModule {}
