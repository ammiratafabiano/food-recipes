import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
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
import { firstValueFrom } from 'rxjs';
import { Group } from 'src/app/models/group.model';
import { AlertService } from 'src/app/services/alert.service';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { LoadingService } from 'src/app/services/loading.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { environment } from 'src/environments/environment';
import { shareOrCopy } from 'src/app/utils/clipboard';

@Component({
  selector: 'app-planning-detail',
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="onBackClicked()">
            <ion-icon slot="icon-only" name="chevron-back-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ 'PLANNING_DETAIL.TITLE' | translate }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>{{ 'PLANNING_DETAIL.DESCRIPTION' | translate }}</p>

      @if (dataService.planningEnabled() && dataLoaded()) {
        <h2>{{ 'GROUP_MANAGEMENT_PAGE.TITLE' | translate }}</h2>

        @if (group(); as groupData) {
          <ion-item lines="none" class="ion-margin-bottom">
            <ion-label class="ion-text-wrap">
              <h3>{{ 'GROUP_MANAGEMENT_PAGE.LEAVE_GROUP' | translate }}</h3>
              <p>{{ 'GROUP_MANAGEMENT_PAGE.GROUP_ID' | translate }} {{ groupData.id }}</p>
            </ion-label>
          </ion-item>
          <ion-list lines="inset" inset="true">
            @for (user of groupData.users; track trackByUserId($index, user)) {
              <ion-item>
                <ion-label>{{ getUserName(user) }}</ion-label>
              </ion-item>
            }
          </ion-list>
          <div class="ion-margin-top" style="display: flex; gap: 8px;">
            <ion-button size="small" color="danger" (click)="onLeaveGroupClicked()">
              {{ 'GROUP_MANAGEMENT_PAGE.LEAVE_GROUP_BUTTON' | translate }}
            </ion-button>
            <ion-button size="small" (click)="onShareClicked()">
              <ion-icon slot="icon-only" name="share-social-outline"></ion-icon>
            </ion-button>
          </div>
        } @else {
          <p>{{ 'COMMON.PLANNINGS.NO_GROUP_ERROR' | translate }}</p>

          <div class="ion-margin-top">
            <p>{{ 'GROUP_MANAGEMENT_PAGE.CREATE_GROUP' | translate }}</p>
            <ion-button size="small" (click)="onCreateGroupClicked()">
              {{ 'GROUP_MANAGEMENT_PAGE.CREATE_GROUP_BUTTON' | translate }}
            </ion-button>
          </div>

          <div class="ion-margin-top">{{ 'GROUP_MANAGEMENT_PAGE.SEPARATOR' | translate }}</div>

          <div class="ion-margin-top">
            <p>{{ 'GROUP_MANAGEMENT_PAGE.JOIN_GROUP' | translate }}</p>
            <ion-input
              type="text"
              inputmode="text"
              [placeholder]="'GROUP_MANAGEMENT_PAGE.GROUP_ID' | translate"
              [(ngModel)]="newGroupId"
            ></ion-input>
            <ion-button
              size="small"
              class="ion-margin-top"
              [disabled]="!newGroupId || newGroupId!.length < 8"
              (click)="onJoinGroupClicked()"
            >
              {{ 'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_BUTTON' | translate }}
            </ion-button>
          </div>
        }
      }
    </ion-content>
    <ion-footer class="ion-padding">
      <ion-toolbar>
        @if (dataService.planningEnabled()) {
          <ion-button expand="block" color="danger" (click)="onToggle()">
            {{ 'PLANNING_DETAIL.DISABLE' | translate }}
          </ion-button>
        } @else {
          <ion-button expand="block" (click)="onToggle()">
            {{ 'PLANNING_DETAIL.ENABLE' | translate }}
          </ion-button>
        }
      </ion-toolbar>
    </ion-footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonButtons,
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonInput,
  ],
})
export class PlanningDetailPage implements OnInit {
  readonly dataService = inject(DataService);
  private readonly navigationService = inject(NavigationService);
  private readonly loadingService = inject(LoadingService);
  private readonly alertCtrl = inject(AlertController);
  private readonly translateService = inject(TranslateService);
  private readonly alertService = inject(AlertService);
  private readonly authService = inject(AuthService);

  readonly group = signal<Group | undefined>(undefined);
  readonly dataLoaded = signal<boolean>(false);
  readonly userNameMap = signal<Record<string, string>>({});
  newGroupId?: string;

  readonly trackByUserId = (_: number, userId: string) => userId;

  getUserName(userId: string): string {
    return this.userNameMap()[userId] || userId;
  }

  async ngOnInit() {
    await this.loadGroup();
  }

  private async loadGroup() {
    this.dataLoaded.set(false);
    const group = await this.dataService.retrieveGroup();
    this.group.set(group);
    if (group) {
      await this.resolveUserNames(group);
    }
    this.dataLoaded.set(true);
  }

  private async resolveUserNames(group: Group) {
    const currentUser = this.authService.getCurrentUser();
    const users = await this.dataService.getUsers();
    const nameMap: Record<string, string> = {};
    if (currentUser) {
      nameMap[currentUser.id] = currentUser.name;
    }
    if (users) {
      for (const u of users) {
        nameMap[u.id] = u.name;
      }
    }
    this.userNameMap.set(nameMap);
  }

  onBackClicked() {
    this.navigationService.pop();
  }

  async onToggle() {
    const enabling = !this.dataService.planningEnabled();
    if (!enabling && this.group()) {
      // Disabling planning while in a group: confirm and leave group
      const translations = await firstValueFrom(
        this.translateService.get([
          'PLANNING_DETAIL.DISABLE_GROUP_CONFIRM',
          'COMMON.GENERIC_ALERT.OK_BUTTON',
          'COMMON.GENERIC_ALERT.CANCEL_BUTTON',
        ]),
      );
      const alert = await this.alertCtrl.create({
        message: translations['PLANNING_DETAIL.DISABLE_GROUP_CONFIRM'],
        buttons: [
          { text: translations['COMMON.GENERIC_ALERT.CANCEL_BUTTON'], role: 'cancel' },
          { text: translations['COMMON.GENERIC_ALERT.OK_BUTTON'], role: 'confirm' },
        ],
      });
      await alert.present();
      const { role } = await alert.onDidDismiss();
      if (role !== 'confirm') return;

      await this.loadingService.withLoader(async () => {
        const group = this.group()!;
        await this.dataService.leaveGroup(group.id);
        this.dataService.disconnectRealtime();
        this.group.set(undefined);
        await this.dataService.setPlanningEnabled(false);
      });
    } else {
      await this.dataService.setPlanningEnabled(enabling);
    }
  }

  async onCreateGroupClicked() {
    await this.loadingService.withLoader(async () => {
      const group = await this.dataService.createGroup();
      this.group.set(group);
      if (group) await this.resolveUserNames(group);
    });
  }

  async onJoinGroupClicked() {
    const groupId = this.newGroupId;
    if (!groupId) return;
    await this.loadingService.withLoader(async () => {
      const group = await this.dataService.joinGroup(groupId);
      this.group.set(group);
      if (group) await this.resolveUserNames(group);
    });
    this.newGroupId = undefined;
  }

  async onLeaveGroupClicked() {
    const group = this.group();
    if (!group) return;
    await this.loadingService.withLoader(async () => {
      await this.dataService.leaveGroup(group.id);
      this.dataService.disconnectRealtime();
      this.group.set(undefined);
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
