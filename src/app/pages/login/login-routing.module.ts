import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginNavigationPath } from 'src/app/models/navigation-path.enum';

import { LoginPage } from './login.page';

const routes: Routes = [
  {
    path: LoginNavigationPath.Base,
    component: LoginPage
  },
  {
    path: LoginNavigationPath.Register,
    loadChildren: () => import('../register/register.module').then( m => m.RegisterPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LoginPageRoutingModule {}
