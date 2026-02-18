import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonApp, IonLoading, IonRouterOutlet } from '@ionic/angular/standalone';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import updateLocale from 'dayjs/plugin/updateLocale';
import { LoggingService } from './services/logging.service';
import { NavigationService } from './services/navigation.service';
import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IonApp, IonLoading, IonRouterOutlet],
})
export class AppComponent {
  private readonly translate = inject(TranslateService);
  private readonly platform = inject(Platform);
  private readonly loggingService = inject(LoggingService);
  private readonly navigationService = inject(NavigationService);
  public readonly loadingService = inject(LoadingService);

  constructor() {
    this.handleLanguage();
    this.handleAndroidBackButton();
  }

  private handleLanguage() {
    const currentLang = this.translate.getBrowserLang() || 'en';
    this.translate.setDefaultLang(currentLang);
    dayjs.extend(weekOfYear);
    dayjs.extend(updateLocale);
    dayjs.updateLocale(currentLang, {
      weekStart: 1,
    });
  }

  private handleAndroidBackButton() {
    this.platform.backButton.subscribeWithPriority(10, () => {
      this.loggingService.Info(
        'AppComponent',
        'Hardware Back Button',
        'pressed',
      );
      this.navigationService.pop();
    });
  }
}
