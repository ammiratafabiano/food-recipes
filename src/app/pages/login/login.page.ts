import { AuthService } from './../../services/auth.service'
import { Component } from '@angular/core'
import { FormBuilder, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { AlertInput, LoadingController } from '@ionic/angular'
import { tap } from 'rxjs'
import { SessionService } from 'src/app/services/session.service'
import { AlertService } from 'src/app/services/alert.service'
import { TranslateService } from '@ngx-translate/core'

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
    private readonly alertService: AlertService,
    private readonly router: Router,
    private readonly sessionService: SessionService,
    private readonly translateService: TranslateService
  ) {
    // TODO workaround for multiple subscribe
    this.authService.getCurrentUserAsync().pipe(tap((user) => {
      if (user) {
        const loginRedirect = this.sessionService.loginRedirect;
        if (loginRedirect) {
          this.router.navigateByUrl(loginRedirect, { replaceUrl: true });
        } else {
          this.router.navigateByUrl("/home", { replaceUrl: true });
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
        this.alertService.presentConfirmPopup(data.error.message);
      }
    })
  }

  async onForgotPasswordCLicked() {
    const inputs: AlertInput[] = [
      {
        type: "email",
        name: this.translateService.instant("LOGIN_PAGE.FORGOT_PASSWORD_POPUP_EMAIL_INPUT")
      }
    ]
    return this.alertService.presentPromptPopup(
      "LOGIN_PAGE.FORGOT_PASSWORD_POPUP_HEADER",
      "LOGIN_PAGE.FORGOT_PASSWORD_POPUP_MESSAGE",
      inputs,
      "LOGIN_PAGE.FORGOT_PASSWORD_POPUP_OK_BUTTON",
      async (result: any) => {
        const loading = await this.loadingController.create();
        await loading.present();
        const { data, error } = await this.authService.sendPwReset(
          result.email
        );
        await loading.dismiss();

        if (error) {
          this.alertService.presentAlertPopup(
            "COMMON.GENERIC_ALERT.ERROR_HEADER",
            error.message
          );
        } else {
          this.alertService.presentInfoPopup(
            "LOGIN_PAGE.FORGOT_PASSWORD_SUCCESS_POPUP_HEADER"
          );
        }
      }
    );
  }

  async getMagicLink() {
    const inputs: AlertInput[] = [
      {
        type: "email",
        name: this.translateService.instant("LOGIN_PAGE.MAGIC_LINK_POPUP_EMAIL_INPUT")
      },
    ]
    return this.alertService.presentPromptPopup(
      "LOGIN_PAGE.MAGIC_LINK_POPUP_HEADER",
      "LOGIN_PAGE.MAGIC_LINK_POPUP_MESSAGE",
      inputs,
      "LOGIN_PAGE.MAGIC_LINK_POPUP_OK_BUTTON",
      async (result: any) => {
        const loading = await this.loadingController.create();
        await loading.present();
        const { data, error } = await this.authService.signInWithEmail(
          result.email
        );
        await loading.dismiss();

        if (error) {
          this.alertService.presentAlertPopup(
            "COMMON.GENERIC_ALERT.WARNING_HEADER",
            error.message
          );
        } else {
          this.alertService.presentAlertPopup(
            "COMMON.GENERIC_ALERT.ERROR_HEADER",
            "LOGIN_PAGE.MAGIC_LINK_SUCCESS_POPUP_HEADER"
          );
        }
      }
    );
  }

  async onFacebookLoginClicked() {
    const loading = await this.loadingController.create()
    await loading.present()

    this.authService.signInWithFacebook().then(async (data) => {
      await loading.dismiss()

      if (data.error) {
        this.alertService.presentConfirmPopup(data.error.message);
      }
    })
  }

  async onGoogleLoginClicked() {
    const loading = await this.loadingController.create()
    await loading.present()

    this.authService.signInWithGoogle().then(async (data) => {
      await loading.dismiss()

      if (data.error) {
        this.alertService.presentConfirmPopup(data.error.message);
      }
    })
  }
}
