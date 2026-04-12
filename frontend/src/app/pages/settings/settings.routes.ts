import { Routes } from '@angular/router';
import { SettingsNavigationPath } from 'src/app/models/navigation-path.enum';
import { SettingsPage } from './settings.page';

export const SETTINGS_ROUTES: Routes = [
  {
    path: SettingsNavigationPath.Base,
    component: SettingsPage,
  },
  {
    path: SettingsNavigationPath.DeleteUser,
    loadComponent: () => import('../delete-user/delete-user.page').then((m) => m.DeleteUserPage),
  },
  {
    path: SettingsNavigationPath.PlanningDetail,
    loadComponent: () =>
      import('./planning-detail/planning-detail.page').then((m) => m.PlanningDetailPage),
  },
  {
    path: SettingsNavigationPath.SocialDetail,
    loadComponent: () =>
      import('./social-detail/social-detail.page').then((m) => m.SocialDetailPage),
  },
  {
    path: SettingsNavigationPath.NutritionProfile,
    loadComponent: () =>
      import('./nutrition-profile/nutrition-profile.page').then((m) => m.NutritionProfilePage),
  },
];
