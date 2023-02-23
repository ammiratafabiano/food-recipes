import { AuthService } from './../../services/auth.service'
import { Component } from '@angular/core'
import { FormBuilder, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { LoadingController, AlertController } from '@ionic/angular'
import { tap } from 'rxjs'
import { SessionService } from 'src/app/services/session.service'

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  credentials = this.fb.nonNullable.group({
    email: ['', Validators.required],
    password: ['', Validators.required],
  })

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly loadingController: LoadingController,
    private readonly alertController: AlertController,
    private readonly router: Router,
    private readonly sessionService: SessionService
  ) {
    // TODO workaround for multiple subscribe
    this.authService.getCurrentUser().pipe(tap((user) => {
      if (user) {
        const loginRedirect = this.sessionService.loginRedirect;
        if (loginRedirect) {
          this.router.navigateByUrl(loginRedirect, { replaceUrl: true });
        } else {
          this.router.navigateByUrl("/tabs", { replaceUrl: true });
        }
      }
    })).subscribe();
  }

  get email() {
    return this.credentials.controls.email
  }

  get password() {
    return this.credentials.controls.password
  }

  async login() {
    const loading = await this.loadingController.create()
    await loading.present()

    this.authService.signIn(this.credentials.getRawValue()).then(async (data) => {
      await loading.dismiss()

      if (data.error) {
        this.showAlert('Login failed', data.error.message)
      }
    })
  }

  async showAlert(title: string, msg: string) {
    const alert = await this.alertController.create({
      header: title,
      message: msg,
      buttons: ['OK'],
    })
    await alert.present()
  }

  async onForgotPasswordCLicked() {
    const alert = await this.alertController.create({
      header: "Receive a new password",
      message: "Please insert your email",
      inputs: [
        {
          type: "email",
          name: "email",
        },
      ],
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
        },
        {
          text: "Reset password",
          handler: async (result) => {
            const loading = await this.loadingController.create();
            await loading.present();
            const { data, error } = await this.authService.sendPwReset(
              result.email
            );
            await loading.dismiss();

            if (error) {
              this.showAlert("Failed", error.message);
            } else {
              this.showAlert(
                "Success",
                "Please check your emails for further instructions!"
              );
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async getMagicLink() {
    const alert = await this.alertController.create({
      header: "Get a Magic Link",
      message: "We will send you a link to magically log in!",
      inputs: [
        {
          type: "email",
          name: "email",
        },
      ],
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
        },
        {
          text: "Get Magic Link",
          handler: async (result) => {
            const loading = await this.loadingController.create();
            await loading.present();
            const { data, error } = await this.authService.signInWithEmail(
              result.email
            );
            await loading.dismiss();

            if (error) {
              this.showAlert("Failed", error.message);
            } else {
              this.showAlert(
                "Success",
                "Please check your emails for further instructions!"
              );
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async onFacebookLoginClicked() {
    const loading = await this.loadingController.create()
    await loading.present()

    this.authService.signInWithFacebook().then(async (data) => {
      await loading.dismiss()

      if (data.error) {
        this.showAlert('Login failed', data.error.message)
      }
    })
  }

  async onGoogleLoginClicked() {
    const loading = await this.loadingController.create()
    await loading.present()

    this.authService.signInWithGoogle().then(async (data) => {
      await loading.dismiss()

      if (data.error) {
        this.showAlert('Login failed', data.error.message)
      }
    })
  }
}
