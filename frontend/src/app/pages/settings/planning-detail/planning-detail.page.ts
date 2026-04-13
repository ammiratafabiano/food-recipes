import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { AlertController } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { Group } from 'src/app/models/group.model';
import { DataService } from 'src/app/services/data.service';
import { LoadingService } from 'src/app/services/loading.service';
import { NavigationService } from 'src/app/services/navigation.service';

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
      @if (dataService.planningEnabled() && group()) {
        <ion-item
          color="warning"
          lines="none"
          class="ion-margin-top"
          style="--border-radius: 8px; --padding-start: 0;"
        >
          <ion-icon name="alert-circle-outline" slot="start"></ion-icon>
          <ion-label class="ion-text-wrap">
            {{ 'PLANNING_DETAIL.GROUP_WARNING' | translate }}
          </ion-label>
        </ion-item>
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
  ],
})
export class PlanningDetailPage implements OnInit {
  readonly dataService = inject(DataService);
  private readonly navigationService = inject(NavigationService);
  private readonly loadingService = inject(LoadingService);
  private readonly alertCtrl = inject(AlertController);
  private readonly translateService = inject(TranslateService);

  readonly group = signal<Group | undefined>(undefined);

  async ngOnInit() {
    const group = await this.dataService.retrieveGroup();
    this.group.set(group);
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
          { text: translations['COMMON.GENERIC_ALERT.OK_BUTTON'], role: 'confirm' },
          { text: translations['COMMON.GENERIC_ALERT.CANCEL_BUTTON'], role: 'cancel' },
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
}
