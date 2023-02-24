import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RecipeListPage } from './recipe-list.page';

const routes: Routes = [
  {
    path: '',
    component: RecipeListPage,
  },
  {
    path: 'recipe',
    loadChildren: () => import('../recipe/recipe.module').then( m => m.RecipePageModule)
  },
  {
    path: 'add-recipe',
    loadChildren: () => import('../add-recipe/add-recipe.module').then( m => m.AddRecipePageModule)
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RecipeListPageRoutingModule {}
