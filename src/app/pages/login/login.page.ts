import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { filter, forkJoin, take } from 'rxjs';
import { NavigationPath } from 'src/app/models/navigation-path.enum';
import { AlertService } from 'src/app/services/alert.service';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { LoadingService } from 'src/app/services/loading.service';
import { LoggingService } from 'src/app/services/logging.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { SessionService } from 'src/app/services/session.service';

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
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly loggingService = inject(LoggingService);
  private readonly dataService = inject(DataService);
  private readonly navigationService = inject(NavigationService);

  /** Show fallback Google button only when One Tap fails */
  readonly showFallbackButton = signal(false);

  constructor() {
    this.init();
  }

  async ionViewDidEnter() {
    this.showFallbackButton.set(false);

    // Try automatic One Tap sign-in first
    try {
      const credential = await this.authService.promptGoogleOneTap();
      await this.handleGoogleCredential(credential);
    } catch {
      // One Tap not available or dismissed → show the button as fallback
      this.showFallbackButton.set(true);
      this.authService.renderGoogleButton('google-btn-container', async (response) => {
        if (response.credential) {
          await this.handleGoogleCredential(response.credential);
        }
      });
    }
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
      if (params['group'] && isLogged) {
        this.loggingService.Info('AppComponent', 'Query String Param', 'group: ' + params['group']);
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

  private handleLoginNavigation() {
    const loginRedirect = this.sessionService.loginRedirect();
    if (loginRedirect) {
      this.router.navigateByUrl(loginRedirect, { replaceUrl: true }).then(() => {
        this.sessionService.setLoginRedirect(undefined);
      });
    } else {
      this.router.navigateByUrl('/home', { replaceUrl: true });
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
