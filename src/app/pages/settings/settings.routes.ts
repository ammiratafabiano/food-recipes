import { Routes } from '@angular/router';
import { SettingsNavigationPath } from 'src/app/models/navigation-path.enum';
import { SettingsPage } from './settings.page';

export const SETTINGS_ROUTES: Routes = [
  {
    path: SettingsNavigationPath.Base,
    component: SettingsPage,
  },
  {
    path: SettingsNavigationPath.GroupManagement,
    loadComponent: () =>
      import('../group-management/group-management.page').then(
        (m) => m.GroupManagementPage,
      ),
  },
  {
    path: SettingsNavigationPath.DeleteUser,
    loadComponent: () =>
      import('../delete-user/delete-user.page').then((m) => m.DeleteUserPage),
  },
];
