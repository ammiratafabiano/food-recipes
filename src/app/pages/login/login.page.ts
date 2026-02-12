import { AuthService } from './../../services/auth.service';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertInput } from '@ionic/angular';
import { filter, forkJoin, take } from 'rxjs';
import { SessionService } from 'src/app/services/session.service';
import { AlertService } from 'src/app/services/alert.service';
import { TranslateService } from '@ngx-translate/core';
import { LoggingService } from 'src/app/services/logging.service';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { NavigationPath } from 'src/app/models/navigation-path.enum';
import { LoadingService } from 'src/app/services/loading.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);
  private readonly alertService = inject(AlertService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly translateService = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly loggingService = inject(LoggingService);
  private readonly dataService = inject(DataService);
  private readonly navigationService = inject(NavigationService);

  credentials = this.fb.nonNullable.group({
    email: ['', Validators.required],
    password: ['', Validators.required],
  });

  constructor() {
    this.init();
  }

  get email() {
    return this.credentials.controls.email;
  }

  get password() {
    return this.credentials.controls.password;
  }

  async login() {
    await this.loadingService.withLoader(async () => {
      const data = await this.authService.signIn(
        this.credentials.getRawValue(),
      );
      if (data.error) {
        this.alertService.presentAlertPopup(
          'COMMON.GENERIC_ALERT.ERROR_HEADER',
          data.error.message,
        );
      } else {
        this.handleLoginNavigation();
      }
    });
  }

  async onForgotPasswordCLicked() {
    const emailInputName = this.translateService.instant(
      'LOGIN_PAGE.FORGOT_PASSWORD_POPUP_EMAIL_INPUT',
    );
    const inputs: AlertInput[] = [
      {
        type: 'email',
        name: emailInputName,
      },
    ];
    return this.alertService.presentPromptPopup(
      'LOGIN_PAGE.FORGOT_PASSWORD_POPUP_HEADER',
      'LOGIN_PAGE.FORGOT_PASSWORD_POPUP_MESSAGE',
      inputs,
      'LOGIN_PAGE.FORGOT_PASSWORD_POPUP_OK_BUTTON',
      async (result: Record<string, string>) => {
        await this.loadingService.withLoader(async () => {
          const { error } = await this.authService.sendPwReset(
            result[emailInputName],
          );
          if (error) {
            this.alertService.presentAlertPopup(
              'COMMON.GENERIC_ALERT.ERROR_HEADER',
              error.message,
            );
          } else {
            this.alertService.presentInfoPopup(
              'LOGIN_PAGE.FORGOT_PASSWORD_SUCCESS_POPUP_HEADER',
            );
          }
        });
      },
    );
  }

  async getMagicLink() {
    const emailInputName = this.translateService.instant(
      'LOGIN_PAGE.MAGIC_LINK_POPUP_EMAIL_INPUT',
    );
    const inputs: AlertInput[] = [
      {
        type: 'email',
        name: emailInputName,
      },
    ];
    return this.alertService.presentPromptPopup(
      'LOGIN_PAGE.MAGIC_LINK_POPUP_HEADER',
      'LOGIN_PAGE.MAGIC_LINK_POPUP_MESSAGE',
      inputs,
      'LOGIN_PAGE.MAGIC_LINK_POPUP_OK_BUTTON',
      async (result: Record<string, string>) => {
        await this.loadingService.withLoader(async () => {
          const response = await this.authService.signInWithEmail(
            result[emailInputName],
          );
          if (response.error) {
            this.alertService.presentAlertPopup(
              'COMMON.GENERIC_ALERT.WARNING_HEADER',
              response.error.message,
            );
          } else {
            this.alertService.presentAlertPopup(
              'COMMON.GENERIC_ALERT.ERROR_HEADER',
              'LOGIN_PAGE.MAGIC_LINK_SUCCESS_POPUP_HEADER',
            );
          }
        });
      },
    );
  }

  async onFacebookLoginClicked() {
    await this.loadingService.withLoader(async () => {
      const data = await this.authService.signInWithFacebook();
      if (data.error) {
        this.alertService.presentConfirmPopup(data.error.message);
      } else {
        this.handleLoginNavigation();
      }
    });
  }

  async onGoogleLoginClicked() {
    await this.loadingService.withLoader(async () => {
      const data = await this.authService.signInWithGoogle();
      if (data.error) {
        this.alertService.presentConfirmPopup(data.error.message);
      } else {
        this.handleLoginNavigation();
      }
    });
  }

  private async init() {
    forkJoin({
      user: this.getUserState(),
      params: this.getQueryStringParams(),
    }).subscribe((response) => {
      const isLogged = !!response.user;
      const params = response.params;
      if (params['group'] && isLogged) {
        this.loggingService.Info(
          'AppComponent',
          'Query String Param',
          'group: ' + params['group'],
        );
        const group_id: string = params['group'];
        this.joinGroup(group_id);
        this.handleLoginNavigation();
      } else if (params['recipe']) {
        this.loggingService.Info(
          'AppComponent',
          'Query String Param',
          'recipe: ' + params['recipe'],
        );
        const recipe_id: string = params['recipe'];
        this.goToRecipePage(recipe_id, () => {
          isLogged && this.handleLoginNavigation();
        });
      } else if (params['user']) {
        this.loggingService.Info(
          'AppComponent',
          'Query String Param',
          'user: ' + params['user'],
        );
        const user_id: string = params['user'];
        this.goToUserPage(user_id, () => {
          isLogged && this.handleLoginNavigation();
        });
      } else if (isLogged) {
        this.handleLoginNavigation();
      }
    });
  }

  private getUserState() {
    return this.authService.getCurrentUserAsync().pipe(
      filter((x) => x != undefined),
      take(1),
    );
  }

  private getQueryStringParams() {
    return this.route.queryParams.pipe(take(1));
  }

  private handleLoginNavigation() {
    const loginRedirect = this.sessionService.loginRedirect();
    if (loginRedirect) {
      this.router
        .navigateByUrl(loginRedirect, { replaceUrl: true })
        .then(() => {
          this.sessionService.setLoginRedirect(undefined);
        });
    } else {
      this.router.navigateByUrl('/home', { replaceUrl: true });
    }
  }

  private async joinGroup(group_id: string) {
    await this.loadingService.withLoader(async () => {
      await this.dataService.joinGroup(group_id);
      this.alertService.presentConfirmPopup(
        'GROUP_MANAGEMENT_PAGE.ADDED_GROUP_ALERT',
      );
    });
  }

  private async goToRecipePage(
    recipe_id: string,
    onDismissCallback?: (params?: unknown) => void | Promise<void>,
  ) {
    this.navigationService.setRoot(NavigationPath.Recipe, {
      queryParams: { id: recipe_id },
      dismissCallback: onDismissCallback,
    });
  }

  private async goToUserPage(
    user_id: string,
    onDismissCallback?: (params?: unknown) => void | Promise<void>,
  ) {
    this.navigationService.setRoot(NavigationPath.User, {
      queryParams: { id: user_id },
      dismissCallback: onDismissCallback,
    });
  }
}
