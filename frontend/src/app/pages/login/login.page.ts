import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { filter, forkJoin, take } from 'rxjs';
import { NavigationPath } from 'src/app/models/navigation-path.enum';
import { AlertService } from 'src/app/services/alert.service';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { LoadingService } from 'src/app/services/loading.service';
import { LoggingService } from 'src/app/services/logging.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { SessionService } from 'src/app/services/session.service';

declare const google: { accounts: unknown } | undefined;

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [TranslateModule, IonContent, IonSpinner],
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);
  private readonly alertService = inject(AlertService);
  private readonly alertCtrl = inject(AlertController);
  private readonly translateService = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly loggingService = inject(LoggingService);
  private readonly dataService = inject(DataService);
  private readonly navigationService = inject(NavigationService);

  /** Show fallback Google button only when One Tap fails */
  readonly showFallbackButton = signal(true);

  constructor() {
    this.init();
  }

  async ionViewDidEnter() {
    const handleCredential = async (response: { credential?: string }) => {
      if (response.credential) {
        await this.handleGoogleCredential(response.credential);
      }
    };

    // Wait for the Google Identity Services SDK to load before rendering
    await this.waitForGoogleSdk();

    // Render the button
    this.authService.renderGoogleButton('google-btn-container', handleCredential);

    // Try automatic One Tap sign-in in the background
    this.authService.promptGoogleOneTap(handleCredential);
  }

  /**
   * Polls until the Google Identity Services SDK (`google.accounts`) is
   * available, with a max wait of 5 seconds.
   */
  private waitForGoogleSdk(timeout = 5000): Promise<void> {
    return new Promise((resolve) => {
      if (typeof google !== 'undefined' && google?.accounts) {
        resolve();
        return;
      }
      const start = Date.now();
      const interval = setInterval(() => {
        if ((typeof google !== 'undefined' && google?.accounts) || Date.now() - start > timeout) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }

  private async handleGoogleCredential(credential: string) {
    await this.loadingService.withLoader(async () => {
      const data = await this.authService.signInWithGoogle(credential);
      if (data.error) {
        this.alertService.presentConfirmPopup(data.error.message);
        this.showFallbackButton.set(true);
        this.authService.renderGoogleButton('google-btn-container', async (response) => {
          if (response.credential) {
            await this.handleGoogleCredential(response.credential);
          }
        });
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

      // Save ?group= to session for handling after login
      if (params['group']) {
        this.loggingService.Info('AppComponent', 'Query String Param', 'group: ' + params['group']);
        this.sessionService.setPendingGroupId(params['group']);
      }

      if (params['recipe']) {
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
        this.loggingService.Info('AppComponent', 'Query String Param', 'user: ' + params['user']);
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

  private async handleLoginNavigation() {
    // Check if there's a pending group invite
    const pendingGroupId = this.sessionService.pendingGroupId();
    if (pendingGroupId) {
      this.sessionService.setPendingGroupId(undefined);
      await this.confirmAndJoinGroup(pendingGroupId);
    }

    const loginRedirect = this.sessionService.loginRedirect();
    if (loginRedirect) {
      // Strip ?group= from redirect URL to avoid re-triggering
      const cleanUrl = this.stripGroupParam(loginRedirect);
      this.router.navigateByUrl(cleanUrl || '/home', { replaceUrl: true }).then(() => {
        this.sessionService.setLoginRedirect(undefined);
      });
    } else {
      this.router.navigateByUrl('/home', { replaceUrl: true });
    }
  }

  private stripGroupParam(url: string): string {
    try {
      const urlTree = this.router.parseUrl(url);
      delete urlTree.queryParams['group'];
      return urlTree.toString();
    } catch {
      return url;
    }
  }

  private async confirmAndJoinGroup(group_id: string) {
    const alert = await this.alertCtrl.create({
      message: this.translateService.instant('GROUP_MANAGEMENT_PAGE.JOIN_GROUP_CONFIRM'),
      buttons: [
        {
          text: this.translateService.instant('GROUP_MANAGEMENT_PAGE.JOIN_GROUP_BUTTON'),
          role: 'confirm',
        },
        {
          text: this.translateService.instant('COMMON.GENERIC_ALERT.CANCEL_BUTTON'),
          role: 'cancel',
        },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'confirm') {
      await this.joinGroup(group_id);
    }
  }

  private async joinGroup(group_id: string) {
    await this.loadingService.withLoader(async () => {
      await this.dataService.joinGroup(group_id);
      this.alertService.presentConfirmPopup('GROUP_MANAGEMENT_PAGE.ADDED_GROUP_ALERT');
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
