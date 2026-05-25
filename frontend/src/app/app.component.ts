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
  private readonly navigationService = inject(NavigationService);
  public readonly loadingService = inject(LoadingService);
  private readonly router = inject(Router);
  private readonly alertCtrl = inject(AlertController);
  private readonly authService = inject(AuthService);
  private readonly dataService = inject(DataService);
  private readonly sessionService = inject(SessionService);

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
        // Clean url regardless of login state
        window.history.replaceState({}, '', window.location.pathname);
        if (!user) {
          // Not logged in — save group ID for after login
          this.sessionService.setPendingGroupId(groupId);
          return;
        }

        // Validate the group exists
        const targetGroup = await this.dataService.getGroup(groupId);
        if (!targetGroup) {
          const msg = await firstValueFrom(
            this.translate.get('GROUP_MANAGEMENT_PAGE.INVALID_GROUP_LINK'),
          );
          const alert = await this.alertCtrl.create({ message: msg, buttons: ['OK'] });
          await alert.present();
          return;
        }

        // Check if user already belongs to this group
        const existingGroup = await this.dataService.retrieveGroup(true);
        if (existingGroup?.id === groupId) {
          const msg = await firstValueFrom(
            this.translate.get('GROUP_MANAGEMENT_PAGE.ALREADY_IN_GROUP'),
          );
          const alert = await this.alertCtrl.create({ message: msg, buttons: ['OK'] });
          await alert.present();
          return;
        }

        // Wait for translations to be loaded before building the alert
        const translationKeys = [
          'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_CONFIRM',
          'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_CONFIRM_LEAVE_CURRENT',
          'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_BUTTON',
          'COMMON.GENERIC_ALERT.CANCEL_BUTTON',
        ];
        const translations = await firstValueFrom(this.translate.get(translationKeys));

        const messageKey = existingGroup
          ? 'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_CONFIRM_LEAVE_CURRENT'
          : 'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_CONFIRM';

        const alert = await this.alertCtrl.create({
          message: translations[messageKey],
          buttons: [
            {
              text: translations['COMMON.GENERIC_ALERT.CANCEL_BUTTON'],
              role: 'cancel',
            },
            {
              text: translations['GROUP_MANAGEMENT_PAGE.JOIN_GROUP_BUTTON'],
              role: 'confirm',
            },
          ],
        });
        await alert.present();
        const { role } = await alert.onDidDismiss();
        if (role === 'confirm') {
          await this.loadingService.withLoader(async () => {
            await this.dataService.joinGroup(groupId);
            // Refresh user settings so planningEnabled signal updates immediately
            await this.dataService.loadUserSettings();
            // If planning wasn't enabled, enable it now (joining a group implies planning)
            if (!this.dataService.planningEnabled()) {
              await this.dataService.setPlanningEnabled(true);
            }
          });
          // Navigate to planning detail page (where group is managed)
          this.navigationService.setRoot(
            [
              NavigationPath.Base,
              HomeNavigationPath.Settings,
              SettingsNavigationPath.PlanningDetail,
            ],
            { animationDirection: 'forward' },
          );
        }
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
