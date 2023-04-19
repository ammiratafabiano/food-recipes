import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RecipeListNavigationPath } from 'src/app/models/navigation-path.enum';
import { RecipeListPage } from './recipe-list.page';

const routes: Routes = [
  {
    path: RecipeListNavigationPath.Base,
    component: RecipeListPage,
  },
  {
    path: RecipeListNavigationPath.Recipe,
    loadChildren: () => import('../recipe/recipe.module').then( m => m.RecipePageModule)
  },
  {
    path: RecipeListNavigationPath.AddRecipe,
    loadChildren: () => import('../add-recipe/add-recipe.module').then( m => m.AddRecipePageModule)
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RecipeListPageRoutingModule {}
