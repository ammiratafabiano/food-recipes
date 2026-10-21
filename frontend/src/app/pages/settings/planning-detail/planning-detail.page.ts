import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
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
      <p class="description-text">{{ 'PLANNING_DETAIL.DESCRIPTION' | translate }}</p>

      @if (dataService.planningEnabled() && dataLoaded()) {
        <div class="group-section-container">
          <h2 class="section-title">{{ 'GROUP_MANAGEMENT_PAGE.TITLE' | translate }}</h2>

          @if (group(); as groupData) {
            <ion-card class="group-card">
              <ion-card-header>
                <div class="group-header-row">
                  <div>
                    <ion-card-title>{{
                      'GROUP_MANAGEMENT_PAGE.LEAVE_GROUP' | translate
                    }}</ion-card-title>
                    <ion-card-subtitle
                      >{{ 'GROUP_MANAGEMENT_PAGE.GROUP_ID' | translate }}
                      {{ groupData.id }}</ion-card-subtitle
                    >
                  </div>
                  <ion-button
                    fill="clear"
                    color="primary"
                    (click)="onShareClicked()"
                    aria-label="Condividi gruppo"
                  >
                    <ion-icon slot="icon-only" name="share-social-outline"></ion-icon>
                  </ion-button>
                </div>
              </ion-card-header>
              <ion-card-content>
                <ion-list lines="inset" inset="true" class="members-list">
                  @for (user of groupData.users; track trackByUserId($index, user)) {
                    <ion-item>
                      <ion-icon slot="start" name="person-outline" color="primary"></ion-icon>
                      <ion-label>{{ getUserName(user) }}</ion-label>
                    </ion-item>
                  }
                </ion-list>
                <div class="group-actions ion-margin-top">
                  <ion-button
                    expand="block"
                    fill="outline"
                    color="danger"
                    (click)="onLeaveGroupClicked()"
                  >
                    <ion-icon slot="start" name="log-out-outline"></ion-icon>
                    {{ 'GROUP_MANAGEMENT_PAGE.LEAVE_GROUP_BUTTON' | translate }}
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          } @else {
            <ion-card class="group-card">
              <ion-card-header>
                <ion-card-title class="card-title-centered">{{
                  'GROUP_MANAGEMENT_PAGE.CREATE_GROUP' | translate
                }}</ion-card-title>
                <ion-card-subtitle class="card-subtitle-centered"
                  >Crea un gruppo per condividere il menu settimanale con la famiglia o
                  coinquilini</ion-card-subtitle
                >
              </ion-card-header>
              <ion-card-content class="ion-text-center">
                <ion-button (click)="onCreateGroupClicked()" class="action-btn">
                  <ion-icon slot="start" name="people-outline"></ion-icon>
                  {{ 'GROUP_MANAGEMENT_PAGE.CREATE_GROUP_BUTTON' | translate }}
                </ion-button>

                <div class="divider-text ion-margin-vertical">
                  <span>{{ 'GROUP_MANAGEMENT_PAGE.SEPARATOR' | translate }}</span>
                </div>

                <div class="join-group-wrapper">
                  <p class="join-label">{{ 'GROUP_MANAGEMENT_PAGE.JOIN_GROUP' | translate }}</p>
                  <div class="input-button-row">
                    <ion-input
                      class="custom-code-input"
                      type="text"
                      inputmode="text"
                      [placeholder]="'GROUP_MANAGEMENT_PAGE.GROUP_ID' | translate"
                      [(ngModel)]="newGroupId"
                    ></ion-input>
                    <ion-button
                      [disabled]="!newGroupId || newGroupId!.length < 8"
                      (click)="onJoinGroupClicked()"
                      class="join-btn"
                    >
                      {{ 'GROUP_MANAGEMENT_PAGE.JOIN_GROUP_BUTTON' | translate }}
                    </ion-button>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          }
        </div>
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
  styles: [
    `
      .description-text {
        color: var(--ion-color-medium);
        font-size: 0.95rem;
        line-height: 1.4;
        margin-bottom: 20px;
      }

      .section-title {
        font-weight: 700;
        font-size: 1.2rem;
        margin-bottom: 12px;
      }

      .group-card {
        margin: 0 0 20px 0;
        border-radius: 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
        border: 1px solid var(--ion-color-step-100, rgba(0, 0, 0, 0.06));
      }

      .group-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .card-title-centered {
        font-weight: 700;
        font-size: 1.1rem;
      }

      .card-subtitle-centered {
        font-size: 0.88rem;
        margin-top: 4px;
      }

      .divider-text {
        position: relative;
        text-align: center;
        font-weight: 600;
        font-size: 0.82rem;
        color: var(--ion-color-medium);
        text-transform: uppercase;
        letter-spacing: 0.05em;

        &::before,
        &::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 35%;
          height: 1px;
          background: var(--ion-color-step-150, #e0e0e0);
        }

        &::before {
          left: 0;
        }

        &::after {
          right: 0;
        }
      }

      .join-group-wrapper {
        text-align: left;
      }

      .join-label {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--ion-color-dark);
        margin-bottom: 8px;
      }

      .input-button-row {
        display: flex;
        align-items: center;
        gap: 8px;

        .custom-code-input {
          flex: 1;
          background: var(--ion-color-step-50, #f8f9fa);
          border: 1px solid var(--ion-color-step-150, #e0e0e0);
          border-radius: 12px;
          padding: 4px 12px;
          font-size: 0.95rem;
        }

        .join-btn {
          --border-radius: 12px;
          height: 42px;
          margin: 0;
          flex-shrink: 0;
        }
      }

      .action-btn {
        --border-radius: 12px;
        height: 44px;
        font-weight: 600;
        margin: 8px 0;
      }
    `,
  ],
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
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
  ],
})
export class PlanningDetailPage {
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

  async ionViewDidEnter() {
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
