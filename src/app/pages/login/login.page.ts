import { AuthService } from './../../services/auth.service'
import { Component } from '@angular/core'
import { FormBuilder, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { AlertInput, LoadingController } from '@ionic/angular'
import { Subject, debounceTime, filter, forkJoin, map, of, take, takeUntil } from 'rxjs'
import { SessionService } from 'src/app/services/session.service'
import { AlertService } from 'src/app/services/alert.service'
import { TranslateService } from '@ngx-translate/core'
import { LoggingService } from 'src/app/services/logging.service'
import { DataService } from 'src/app/services/data.service'
import { NavigationService } from 'src/app/services/navigation.service'
import { NavigationPath } from 'src/app/models/navigation-path.enum'

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
    private readonly dataService: DataService,
    private readonly navigationService: NavigationService
  ) {
    this.init();
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
        this.alertService.presentAlertPopup(
          "COMMON.GENERIC_ALERT.ERROR_HEADER",
          data.error.message
        );
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

  private async init() {
    forkJoin({
      user: this.getUserState(),
      params: this.getQueryStringParams()
    }).subscribe((response) => {
      const isLogged = !!response.user;
      const params = response.params;
      if (params["group"] && isLogged) {
        this.loggingService.Info("AppComponent", "Query String Param", "group: " + params["group"]);
        const group_id: string= params["group"];
        this.joinGroup(group_id);
        this.handleLoginNavigation();
      } else if (params["recipe"]) {
        this.loggingService.Info("AppComponent", "Query String Param", "recipe: " + params["recipe"]);
        const recipe_id: string = params["recipe"];
        this.goToRecipePage(recipe_id, () => {
          isLogged && this.handleLoginNavigation();
        });
      } else if (params["user"]) {
        this.loggingService.Info("AppComponent", "Query String Param", "user: " + params["user"]);
        const user_id: string = params["user"];
        this.goToUserPage(user_id, () => {
          isLogged && this.handleLoginNavigation();
        });
      } else if (isLogged) {
        this.handleLoginNavigation();
      }
    })
  }

  private getUserState() {
    return this.authService.getCurrentUserAsync().pipe(filter(x=> x != undefined),take(1));
  }

  private getQueryStringParams() {
    let stop$ = new Subject<boolean>();
    setTimeout(() => {
      stop$.next(false);
      stop$.complete();
    }, 500)
    return this.route.queryParams.pipe(
      takeUntil(stop$)
    );
  }

  private handleLoginNavigation() {
    const loginRedirect = this.sessionService.loginRedirect;
    if (loginRedirect) {
      this.router.navigateByUrl(loginRedirect, { replaceUrl: true }).then(() => {
        this.sessionService.loginRedirect = undefined;
      });
    } else {
      this.router.navigateByUrl("/home", { replaceUrl: true });
    }
  }
  
  private async joinGroup(group_id: string) {
    const loading = await this.loadingController.create();
    await loading.present();
    await this.dataService.joinGroup(group_id);
    this.alertService.presentConfirmPopup("GROUP_MANAGEMENT_PAGE.ADDED_GROUP_ALERT");
    await loading.dismiss();
  }


  private async goToRecipePage(recipe_id: string, onDismissCallback?: Function) {
    this.navigationService.setRoot(NavigationPath.Recipe,
      {
        queryParams: { id: recipe_id },
        dismissCallback: onDismissCallback
      }
    );
  }

  private async goToUserPage(user_id: string, onDismissCallback?: Function) {
    this.navigationService.setRoot(NavigationPath.User,
      {
        queryParams: { id: user_id },
        dismissCallback: onDismissCallback
      }
    );
  }
}
