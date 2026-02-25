import { Routes } from '@angular/router';
import { LoginNavigationPath } from 'src/app/models/navigation-path.enum';
import { LoginPage } from './login.page';

export const LOGIN_ROUTES: Routes = [
  {
    path: LoginNavigationPath.Base,
    component: LoginPage,
  },
];
