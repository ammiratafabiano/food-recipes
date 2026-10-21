import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, Platform } from '@ionic/angular';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import updateLocale from 'dayjs/plugin/updateLocale';
import 'dayjs/locale/it';
import { filter, firstValueFrom, take } from 'rxjs';
import { LoggingService } from './services/logging.service';
import { NavigationService } from './services/navigation.service';
import { LoadingService } from './services/loading.service';
import { AuthService } from './services/auth.service';
import { DataService } from './services/data.service';
import { SessionService } from './services/session.service';
import { GroupInviteService } from './services/group-invite.service';
import {
  NavigationPath,
  HomeNavigationPath,
  SettingsNavigationPath,
} from './models/navigation-path.enum';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly translate = inject(TranslateService);
  private readonly platform = inject(Platform);
  private readonly loggingService = inject(LoggingService);
  public readonly navigationService = inject(NavigationService);
  public readonly loadingService = inject(LoadingService);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly authService = inject(AuthService);
  private readonly dataService = inject(DataService);
  private readonly sessionService = inject(SessionService);
  private readonly groupInviteService = inject(GroupInviteService);

  constructor() {
    this.handleLanguage();
    this.handleAndroidBackButton();
    this.handleSharedLinks();
    this.handleGroupInviteQueryParam();
  }

  /**
   * Handles ?recipe=xxx and ?user=xxx query params from the root URL.
   * These are shared deep-links that must work for both anonymous and logged-in users.
   * Angular's auth guard strips them during the home redirect, so we intercept here
   * via window.location.search before the router processes anything.
   */
  private handleSharedLinks() {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('recipe');
    const userId = urlParams.get('user');
    if (!recipeId && !userId) return;

    // Clean the URL immediately so the params are not re-processed
    window.history.replaceState({}, '', window.location.pathname);

    this.authService
      .getCurrentUserAsync()
      .pipe(
        filter((u) => u !== undefined),
        take(1),
      )
      .subscribe((user) => {
        const isLogged = !!user;
        if (recipeId) {
          this.navigationService.setRoot(NavigationPath.Recipe, {
            queryParams: { id: recipeId },
            dismissCallback: () => {
              if (isLogged) {
                this.navigationService.setRoot(
                  [NavigationPath.Base, HomeNavigationPath.RecipeList],
                  { animationDirection: 'back' },
                );
              } else {
                this.navigationService.setRoot(NavigationPath.Login);
              }
            },
          });
        } else if (userId) {
          this.navigationService.setRoot(NavigationPath.User, {
            queryParams: { id: userId },
            dismissCallback: () => {
              if (isLogged) {
                this.navigationService.setRoot([NavigationPath.Base, HomeNavigationPath.Discover], {
                  animationDirection: 'back',
                });
              } else {
                this.navigationService.setRoot(NavigationPath.Login);
              }
            },
          });
        }
      });
  }

  /**
   * If the URL contains ?group=xxx and the user is already logged in,
   * show a confirmation dialog and join the group.
   * (Non-logged-in users are handled by the auth guard + login page.)
   */
  private handleGroupInviteQueryParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('group');
    if (!groupId) return;

    this.authService
      .getCurrentUserAsync()
      .pipe(
        filter((u) => u !== undefined),
        take(1),
      )
      .subscribe(async (user) => {
        window.history.replaceState({}, '', window.location.pathname);
        if (!user) {
          this.sessionService.setPendingGroupId(groupId);
          return;
        }

        await this.groupInviteService.processGroupInvite(groupId);
      });
  }

  private handleLanguage() {
    const supportedLangs = ['en', 'it'];
    const browserLang = this.translate.getBrowserLang() || 'en';
    const currentLang = supportedLangs.includes(browserLang) ? browserLang : 'en';
    this.translate.setDefaultLang('en');
    this.translate.use(currentLang);
    dayjs.extend(weekOfYear);
    dayjs.extend(updateLocale);
    // Apply weekStart: 1 (Monday) to all locales to ensure consistency across devices
    for (const lang of supportedLangs) {
      dayjs.updateLocale(lang, { weekStart: 1 });
    }
    dayjs.locale(currentLang);
  }

  private handleAndroidBackButton() {
    this.platform.backButton.subscribeWithPriority(10, () => {
      this.loggingService.Info('AppComponent', 'Hardware Back Button', 'pressed');
      this.navigationService.pop();
    });
  }
}
