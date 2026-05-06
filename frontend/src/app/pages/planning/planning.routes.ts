import { Routes } from '@angular/router';

export const PLANNING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./planning.page').then((m) => m.PlanningPage),
  },
  {
    path: 'add',
    loadComponent: () => import('./planning-add/planning-add.page').then((m) => m.PlanningAddPage),
  },
  {
    path: 'add/item-selection',
    loadComponent: () =>
      import('../item-selection/item-selection.page').then((m) => m.ItemSelectionPage),
  },
  {
    path: 'item-selection',
    loadComponent: () =>
      import('../item-selection/item-selection.page').then((m) => m.ItemSelectionPage),
  },
];
