import { Routes } from '@angular/router';
import { PlanningNavigationPath } from 'src/app/models/navigation-path.enum';

export const PLANNING_ROUTES: Routes = [
  {
    path: PlanningNavigationPath.Base,
    loadComponent: () => import('./planning.page').then((m) => m.PlanningPage),
  },
  {
    path: PlanningNavigationPath.GroupManagement,
    loadComponent: () =>
      import('../group-management/group-management.page').then((m) => m.GroupManagementPage),
  },
];
