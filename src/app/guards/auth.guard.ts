import { AuthService } from './../services/auth.service'
import { Injectable } from '@angular/core'
import { CanActivate, Router, UrlTree } from '@angular/router'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { ToastController } from '@ionic/angular'

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.getCurrentUser().pipe(
      // filter((val) => val !== undefined), // TODO
      // take(1), // TODO
      map((isAuthenticated) => {
        if (isAuthenticated) {
          return true
        } else {
          this.toastController
            .create({
              message: 'You are not allowed to access this!',
              duration: 2000,
            })
            .then((toast) => toast.present())

          return this.router.createUrlTree(['/login'])
        }
      })
    )
  }
}
