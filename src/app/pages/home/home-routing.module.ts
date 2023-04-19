import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeNavigationPath } from 'src/app/models/navigation-path.enum';
import { HomePage } from './home.page';

const routes: Routes = [
  {
    path: HomeNavigationPath.Base,
    component: HomePage,
    children: [
      {
        path: HomeNavigationPath.Discover,
        loadChildren: () => import('../discover/discover.module').then(m => m.DiscoverPageModule)
      },
      {
        path: HomeNavigationPath.RecipeList,
        loadChildren: () => import('../recipe-list/recipe-list.module').then(m => m.RecipeListPageModule)
      },
      {
        path: HomeNavigationPath.Planning,
        loadChildren: () => import('../planning/planning.module').then(m => m.PlanningPageModule)
      },
      {
        path: HomeNavigationPath.ShoppingList,
        loadChildren: () => import('../shopping-list/shopping-list.module').then(m => m.ShoppingListModule)
      },
      {
        path: HomeNavigationPath.Settings,
        loadChildren: () => import('../settings/settings.module').then( m => m.SettingsPageModule)
      },
      {
        path: '',
        redirectTo: HomeNavigationPath.RecipeList,
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class HomePageRoutingModule {}
