import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Group } from 'src/app/models/group.model';
import { AlertService } from 'src/app/services/alert.service';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { LoadingService } from 'src/app/services/loading.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { environment } from 'src/environments/environment';
import { shareOrCopy } from 'src/app/utils/clipboard';

@Component({
  selector: 'app-group-management',
  templateUrl: './group-management.page.html',
  styleUrls: ['./group-management.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonLabel,
    IonItem,
    IonList,
    IonInput,
  ],
})
export class GroupManagementPage {
  private readonly dataService = inject(DataService);
  private readonly loadingService = inject(LoadingService);
  private readonly navigationService = inject(NavigationService);
  private readonly translateService = inject(TranslateService);
  private readonly alertService = inject(AlertService);
  private readonly authService = inject(AuthService);

  newGroupId?: string;
  readonly group = signal<Group | undefined>(undefined);
  readonly dataLoaded = signal<boolean>(false);

  /** Map of userId → display name for group members */
  readonly userNameMap = signal<Record<string, string>>({});

  readonly trackByUserId = (_: number, userId: string) => userId;

  getUserName(userId: string): string {
    return this.userNameMap()[userId] || userId;
  }

  constructor() {}

  ionViewDidEnter() {
    this.dataLoaded.set(false);
    this.getGroup();
  }

  private async getGroup() {
    await this.loadingService.withLoader(async () => {
      const group = await this.dataService.retrieveGroup();
      this.group.set(group);
      if (group) {
        await this.resolveUserNames(group);
      }
    });
    this.dataLoaded.set(true);
  }

  private async resolveUserNames(group: Group) {
    const currentUser = this.authService.getCurrentUser();
    const users = await this.dataService.getUsers();
    const nameMap: Record<string, string> = {};

    // Current user
    if (currentUser) {
      nameMap[currentUser.id] = currentUser.name;
    }

    // Other users
    if (users) {
      for (const u of users) {
        nameMap[u.id] = u.name;
      }
    }

    this.userNameMap.set(nameMap);
  }

  async onBackClicked() {
    return this.navigationService.pop();
  }

  async onCreateGroupClicked() {
    await this.loadingService.withLoader(async () => {
      const group = await this.dataService.createGroup();
      this.group.set(group);
    });
  }

  async onJoinGroupClicked() {
    const groupId = this.newGroupId;
    if (!groupId) return;
    await this.loadingService.withLoader(async () => {
      const group = await this.dataService.joinGroup(groupId);
      this.group.set(group);
    });
    this.newGroupId = undefined;
  }

  async onLeaveGroupClicked() {
    const group = this.group();
    if (!group) return;
    await this.loadingService.withLoader(async () => {
      await this.dataService.leaveGroup(group.id);
      // No longer in a group → close the real-time socket
      this.dataService.disconnectRealtime();
      const newGroup = await this.dataService.retrieveGroup();
      this.group.set(newGroup);
    });
  }

  async onShareClicked() {
    const group = this.group();
    if (!group) return;
    const link = environment.siteUrl + '?group=' + group.id;
    const result = await shareOrCopy(link, 'Food Recipes Group');
    if (result === 'copied') {
      const text = this.translateService.instant('COMMON.CLIPBOARD');
      this.alertService.presentInfoPopup(text);
    }
  }
}
