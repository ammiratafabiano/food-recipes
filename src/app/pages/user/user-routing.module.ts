import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { UserNavigationPath } from 'src/app/models/navigation-path.enum';

import { UserPage } from './user.page';

const routes: Routes = [
  {
    path: UserNavigationPath.Base,
    component: UserPage
  },
  {
    path: UserNavigationPath.Recipe,
    loadChildren: () => import('../recipe/recipe.module').then( m => m.RecipePageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserPageRoutingModule {}
