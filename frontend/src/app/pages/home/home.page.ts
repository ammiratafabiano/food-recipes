import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { FeatureFlag, FeatureFlagService } from 'src/app/services/feature-flag.service';
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
  private readonly featureFlagService = inject(FeatureFlagService);
  private readonly dataService = inject(DataService);

  readonly planningEnabled = signal<boolean>(false);

  get isDiscoverEnabled(): boolean {
    return this.featureFlagService.isEnabled(FeatureFlag.Discover);
  }

  async ngOnInit() {
    const profile = await this.dataService.getUserProfile();
    if (profile?.planning_enabled) {
      this.planningEnabled.set(true);
    }
  }
}
