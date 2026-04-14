import { Routes } from '@angular/router';

export const PLANNING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./planning.page').then((m) => m.PlanningPage),
  },
];
