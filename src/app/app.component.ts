import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { LoggingService } from './services/logging.service';
import { NavigationService } from './services/navigation.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(
    private translate: TranslateService,
    private platform: Platform,
    private loggingService: LoggingService,
    private navigationService: NavigationService
  ) {
    this.handleLanguage();
    this.handleAndroidBackButton();
  }

  private handleLanguage() {
    const currentLang = this.translate.getBrowserLang() || "en";
    this.translate.setDefaultLang(currentLang);
    moment.updateLocale(currentLang, {
      week: {
        dow: 1
      }
    })
  }

  private handleAndroidBackButton() {
    this.platform.backButton.subscribeWithPriority(10, () => {
      this.loggingService.Info("AppComponent", "Hardware Back Button", "pressed");
      this.navigationService.pop();
    });
  }
}
