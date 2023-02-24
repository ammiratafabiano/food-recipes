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
    const currentLang = this.translate.getBrowserLang() || "en";
    this.translate.setDefaultLang(currentLang);
    moment.updateLocale(currentLang, {
      week: {
        dow: 1
      }
    })
    this.platform.backButton.subscribeWithPriority(10, () => {
      this.loggingService.Info("AtomHeader", "Hardware Back Button", "pressed");
      this.navigationService.pop();
    });
  }
}
