import { ChangeDetectionStrategy, Component, inject, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import {
  HomeNavigationPath,
  NavigationPath,
  SettingsNavigationPath,
} from 'src/app/models/navigation-path.enum';
import { DataService } from 'src/app/services/data.service';
import { LoadingService } from 'src/app/services/loading.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { SessionService } from 'src/app/services/session.service';

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
  private readonly sessionService = inject(SessionService);
  private readonly loadingService = inject(LoadingService);
  private readonly alertCtrl = inject(AlertController);
  private readonly translateService = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly navController = inject(NavController);

  @ViewChild(IonTabs) tabs!: IonTabs;

  private initialTabLoaded = false;

  ngOnInit() {
    this.dataService.loadUserSettings();
    this.handlePendingGroupInvite();
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

  /**
   * Handle pending group invite that was saved during login flow.
   * Shows confirmation dialog after home has fully rendered.
   */
  private async handlePendingGroupInvite() {
    const pendingGroupId = this.sessionService.pendingGroupId();
    if (!pendingGroupId) return;
    this.sessionService.setPendingGroupId(undefined);

    // Validate the group exists
    const targetGroup = await this.dataService.getGroup(pendingGroupId);
    if (!targetGroup) {
      const msg = await firstValueFrom(
        this.translateService.get('GROUP_MANAGEMENT_PAGE.INVALID_GROUP_LINK'),
      );
      const alert = await this.alertCtrl.create({ message: msg, buttons: ['OK'] });
      await alert.present();
      return;
    }

    // Check if user already belongs to this group
    const existingGroup = await this.dataService.retrieveGroup(true);
    if (existingGroup?.id === pendingGroupId) {
      const msg = await firstValueFrom(
        this.translateService.get('GROUP_MANAGEMENT_PAGE.ALREADY_IN_GROUP'),
      );
      const alert = await this.alertCtrl.create({ message: msg, buttons: ['OK'] });
      await alert.present();
      return;
    }

    const translationKeys = [
      'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_CONFIRM',
      'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_CONFIRM_LEAVE_CURRENT',
      'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_BUTTON',
      'COMMON.GENERIC_ALERT.CANCEL_BUTTON',
    ];
    const translations = await firstValueFrom(this.translateService.get(translationKeys));

    const messageKey = existingGroup
      ? 'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_CONFIRM_LEAVE_CURRENT'
      : 'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_CONFIRM';

    const alert = await this.alertCtrl.create({
      message: translations[messageKey],
      buttons: [
        { text: translations['COMMON.GENERIC_ALERT.CANCEL_BUTTON'], role: 'cancel' },
        { text: translations['GROUP_MANAGEMENT_PAGE.JOIN_GROUP_BUTTON'], role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'confirm') {
      await this.loadingService.withLoader(async () => {
        await this.dataService.joinGroup(pendingGroupId);
        // Refresh user settings so planningEnabled signal updates immediately
        await this.dataService.loadUserSettings();
        // If planning wasn't enabled, enable it now (joining a group implies planning)
        if (!this.dataService.planningEnabled()) {
          await this.dataService.setPlanningEnabled(true);
        }
      });
      // Navigate to planning detail page (where group is managed)
      this.navigationService.setRoot(
        [NavigationPath.Base, HomeNavigationPath.Settings, SettingsNavigationPath.PlanningDetail],
        { animationDirection: 'forward' },
      );
    }
  }
}
