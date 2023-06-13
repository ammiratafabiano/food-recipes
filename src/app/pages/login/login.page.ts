import { AuthService } from './../../services/auth.service'
import { Component } from '@angular/core'
import { FormBuilder, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { AlertInput, LoadingController } from '@ionic/angular'
import { Subject, debounceTime, filter, take, takeUntil } from 'rxjs'
import { SessionService } from 'src/app/services/session.service'
import { AlertService } from 'src/app/services/alert.service'
import { TranslateService } from '@ngx-translate/core'
import { LoggingService } from 'src/app/services/logging.service'
import { DataService } from 'src/app/services/data.service'

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
    private readonly translateService: TranslateService,
    private readonly route: ActivatedRoute,
    private readonly loggingService: LoggingService,
    private readonly dataService: DataService
  ) {
    this.authService.getCurrentUserAsync().pipe(debounceTime(1000)).subscribe(async (user) => {
      if (user) {
        this.handleQueryStringParam();
        const loginRedirect = this.sessionService.loginRedirect;
        if (loginRedirect) {
          this.router.navigateByUrl(loginRedirect, { replaceUrl: true }).then(() => {
            this.sessionService.loginRedirect = undefined;
          });
        } else {
          this.router.navigateByUrl("/home", { replaceUrl: true });
        }
      }
    });
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

  private handleQueryStringParam() {
    let stop$ = new Subject<boolean>();
    setTimeout(() => {
      stop$.next(false);
      stop$.complete();
    }, 500)
    this.route.queryParams.pipe(
      takeUntil(stop$),
      filter(x => Object.keys(x).length > 0),
      take(1)
    ).subscribe(params => {
      if (params) {
        if (params["group"]) {
          this.loggingService.Info("AppComponent", "Query String Param", "group: " + params["group"]);
          const group_id: string= params["group"];
          this.joinGroup(group_id);
        } else if (params["recipe"]) {
          this.loggingService.Info("AppComponent", "Query String Param", "recipe: " + params["recipe"]);
          const recipe_id: string = params["recipe"];
        } else if (params["user"]) {
          this.loggingService.Info("AppComponent", "Query String Param", "user: " + params["user"]);
          const user_id: string = params["user"];
        }
      }
    });
  }
  
  private async joinGroup(group_id: string) {
    const loading = await this.loadingController.create();
    await loading.present();
    await this.dataService.joinGroup(group_id);
    this.alertService.presentConfirmPopup("GROUP_MANAGEMENT_PAGE.ADDED_GROUP_ALERT");
    await loading.dismiss();
  }
}
