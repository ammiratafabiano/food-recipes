import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SettingsNavigationPath } from 'src/app/models/navigation-path.enum';

import { SettingsPage } from './settings.page';

const routes: Routes = [
  {
    path: SettingsNavigationPath.Base,
    component: SettingsPage
  },
  {
    path: SettingsNavigationPath.GroupManagement,
    loadChildren: () => import('../group-management/group-management.module').then( m => m.GroupManagementPageModule)
  },
  {
    path: SettingsNavigationPath.DeleteUser,
    loadChildren: () => import('../delete-user/delete-user.module').then( m => m.DeleteUserPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsPageRoutingModule {}
