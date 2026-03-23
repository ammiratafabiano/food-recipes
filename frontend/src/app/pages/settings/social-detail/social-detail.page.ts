import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-social-detail',
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ 'SOCIAL_DETAIL.TITLE' | translate }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>{{ 'SOCIAL_DETAIL.DESCRIPTION' | translate }}</p>
    </ion-content>
    <ion-footer class="ion-padding">
      <ion-toolbar>
        @if (dataService.socialEnabled()) {
          <ion-button expand="block" color="danger" (click)="onToggle()">
            {{ 'SOCIAL_DETAIL.DISABLE' | translate }}
          </ion-button>
        } @else {
          <ion-button expand="block" (click)="onToggle()">
            {{ 'SOCIAL_DETAIL.ENABLE' | translate }}
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
    IonBackButton,
    IonButton,
  ],
})
export class SocialDetailPage {
  readonly dataService = inject(DataService);

  async onToggle() {
    await this.dataService.setSocialEnabled(!this.dataService.socialEnabled());
  }
}
