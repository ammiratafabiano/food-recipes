import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'recipe-list',
        loadChildren: () => import('../recipe-list/recipe-list.module').then(m => m.RecipeListPageModule)
      },
      {
        path: 'shopping-list',
        loadChildren: () => import('../shopping-list/shopping-list.module').then(m => m.ShoppingListModule)
      },
      {
        path: 'planning',
        loadChildren: () => import('../planning/planning.module').then(m => m.PlanningPageModule)
      },
      {
        path: 'settings',
        loadChildren: () => import('../settings/settings.module').then( m => m.SettingsPageModule)
      },
      {
        path: '',
        redirectTo: '/tabs/recipe-list',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/tabs/recipe-list',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
