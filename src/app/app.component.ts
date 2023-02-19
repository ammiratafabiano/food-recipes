import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(private translate: TranslateService) {
    const currentLang = this.translate.getBrowserLang() || "en";
    this.translate.setDefaultLang(currentLang);
    moment.updateLocale(currentLang, {
      week: {
        dow: 1
      }
    })
  }
}
