import { ChangeDetectionStrategy, Component, inject, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import {
  HomeNavigationPath,
  NavigationPath,
  SettingsNavigationPath,
} from 'src/app/models/navigation-path.enum';
import { DataService } from 'src/app/services/data.service';
import { GroupInviteService } from 'src/app/services/group-invite.service';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [TranslateModule, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class HomePage implements OnInit {
  readonly dataService = inject(DataService);
  private readonly navigationService = inject(NavigationService);
  private readonly groupInviteService = inject(GroupInviteService);
  private readonly router = inject(Router);
  private readonly navController = inject(NavController);

  @ViewChild(IonTabs) tabs!: IonTabs;

  private initialTabLoaded = false;

  ngOnInit() {
    this.dataService.loadUserSettings();
    this.groupInviteService.handlePendingGroupInvite();
  }

  onTabsDidChange() {
    // Skip the first tab change event (initial load / refresh) to preserve the current URL
    if (!this.initialTabLoaded) {
      this.initialTabLoaded = true;
      return;
    }

    // Reset navigation stack when switching tabs to avoid stale back-navigation
    this.navigationService.clearStack();

    // If the selected tab has a sub-page active, navigate back to its root
    const selectedTab = this.tabs.getSelected();
    if (selectedTab) {
      const tabRoot = `/${selectedTab}`;
      const currentUrl = this.router.url.split('?')[0];
      if (currentUrl !== tabRoot && currentUrl.startsWith(tabRoot + '/')) {
        this.navController.navigateBack([tabRoot], { animated: false });
      }
    }
  }
}
