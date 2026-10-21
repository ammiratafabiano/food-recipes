import { inject, Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import {
  HomeNavigationPath,
  NavigationPath,
  SettingsNavigationPath,
} from 'src/app/models/navigation-path.enum';
import { DataService } from './data.service';
import { LoadingService } from './loading.service';
import { NavigationService } from './navigation.service';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root',
})
export class GroupInviteService {
  private readonly dataService = inject(DataService);
  private readonly sessionService = inject(SessionService);
  private readonly loadingService = inject(LoadingService);
  private readonly navigationService = inject(NavigationService);
  private readonly alertCtrl = inject(AlertController);
  private readonly translate = inject(TranslateService);

  /**
   * Prompts user and processes joining a group by invite ID
   */
  async processGroupInvite(groupId: string): Promise<boolean> {
    if (!groupId) return false;

    // Validate the group exists
    const targetGroup = await this.dataService.getGroup(groupId);
    if (!targetGroup) {
      const msg = await firstValueFrom(
        this.translate.get('GROUP_MANAGEMENT_PAGE.INVALID_GROUP_LINK'),
      );
      const alert = await this.alertCtrl.create({ message: msg, buttons: ['OK'] });
      await alert.present();
      return false;
    }

    // Check if user already belongs to this group
    const existingGroup = await this.dataService.retrieveGroup(true);
    if (existingGroup?.id === groupId) {
      const msg = await firstValueFrom(
        this.translate.get('GROUP_MANAGEMENT_PAGE.ALREADY_IN_GROUP'),
      );
      const alert = await this.alertCtrl.create({ message: msg, buttons: ['OK'] });
      await alert.present();
      return false;
    }

    // Wait for translations to be loaded before building the alert
    const translationKeys = [
      'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_CONFIRM',
      'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_CONFIRM_LEAVE_CURRENT',
      'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_BUTTON',
      'COMMON.GENERIC_ALERT.CANCEL_BUTTON',
    ];
    const translations = await firstValueFrom(this.translate.get(translationKeys));

    const messageKey = existingGroup
      ? 'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_CONFIRM_LEAVE_CURRENT'
      : 'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_CONFIRM';

    const alert = await this.alertCtrl.create({
      message: translations[messageKey],
      buttons: [
        {
          text: translations['COMMON.GENERIC_ALERT.CANCEL_BUTTON'],
          role: 'cancel',
        },
        {
          text: translations['GROUP_MANAGEMENT_PAGE.JOIN_GROUP_BUTTON'],
          role: 'confirm',
        },
      ],
    });
    await alert.present();

    const { role } = await alert.onDidDismiss();
    if (role === 'confirm') {
      await this.loadingService.withLoader(async () => {
        await this.dataService.joinGroup(groupId);
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
      return true;
    }

    return false;
  }

  /**
   * Checks if there is a pending group invite stored in session and processes it
   */
  async handlePendingGroupInvite(): Promise<void> {
    const pendingGroupId = this.sessionService.pendingGroupId();
    if (!pendingGroupId) return;
    this.sessionService.setPendingGroupId(undefined);
    await this.processGroupInvite(pendingGroupId);
  }
}
