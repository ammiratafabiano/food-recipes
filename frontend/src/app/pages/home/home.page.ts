import { ChangeDetectionStrategy, Component, inject, OnInit, ViewChild } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';

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
  private readonly navigationService = inject(NavigationService);

  @ViewChild(IonTabs) tabs!: IonTabs;

  ngOnInit() {
    this.dataService.loadUserSettings();
  }

  onTabsDidChange() {
    // Reset navigation stack when switching tabs to avoid stale back-navigation
    this.navigationService.clearStack();
  }
}
