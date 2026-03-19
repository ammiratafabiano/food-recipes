import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [TranslateModule, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class HomePage implements OnInit {
  readonly dataService = inject(DataService);

  ngOnInit() {
    this.dataService.loadUserSettings();
  }
}
