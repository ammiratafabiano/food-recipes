import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, Platform } from '@ionic/angular';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import updateLocale from 'dayjs/plugin/updateLocale';
import { filter, take } from 'rxjs';
import { LoggingService } from './services/logging.service';
import { NavigationService } from './services/navigation.service';
import { LoadingService } from './services/loading.service';
import { AuthService } from './services/auth.service';
import { DataService } from './services/data.service';
import { SessionService } from './services/session.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
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
    this.handleGroupInviteQueryParam();
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
        if (!user) return; // user === 0 means not logged in — handled by login page
        // Clean url
        window.history.replaceState({}, '', window.location.pathname);

        const alert = await this.alertCtrl.create({
          message: this.translate.instant('GROUP_MANAGEMENT_PAGE.JOIN_GROUP_CONFIRM'),
          buttons: [
            {
              text: this.translate.instant('GROUP_MANAGEMENT_PAGE.JOIN_GROUP_BUTTON'),
              role: 'confirm',
            },
            {
              text: this.translate.instant('COMMON.GENERIC_ALERT.CANCEL_BUTTON'),
              role: 'cancel',
            },
          ],
        });
        await alert.present();
        const { role } = await alert.onDidDismiss();
        if (role === 'confirm') {
          await this.loadingService.withLoader(async () => {
            await this.dataService.joinGroup(groupId);
          });
        }
      });
  }

  private handleLanguage() {
    const currentLang = this.translate.getBrowserLang() || 'en';
    this.translate.setDefaultLang(currentLang);
    this.translate.use(currentLang);
    dayjs.extend(weekOfYear);
    dayjs.extend(updateLocale);
    dayjs.updateLocale(currentLang, {
      weekStart: 1,
    });
  }

  private handleAndroidBackButton() {
    this.platform.backButton.subscribeWithPriority(10, () => {
      this.loggingService.Info('AppComponent', 'Hardware Back Button', 'pressed');
      this.navigationService.pop();
    });
  }
}
