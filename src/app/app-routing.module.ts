import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { NavigationPath } from './models/navigation-path.enum';

const routes: Routes = [
  {
    path: NavigationPath.Base,
    redirectTo: NavigationPath.Login,
    pathMatch: 'full'
  },
  {
    path: NavigationPath.Login,
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: NavigationPath.Home,
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: NavigationPath.NotFound,
    loadChildren: () => import('./pages/not-found/not-found.module').then( m => m.NotFoundPageModule)
  },
  {
    path: NavigationPath.Recipe,
    loadChildren: () => import('./pages/recipe/recipe.module').then( m => m.RecipePageModule)
  },
  {
    path: NavigationPath.User,
    loadChildren: () => import('./pages/user/user.module').then( m => m.UserPageModule)
  },
  {
    path: '**',
    redirectTo: NavigationPath.NotFound
  }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
