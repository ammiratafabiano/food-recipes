import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-social-detail',
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="onBackClicked()">
            <ion-icon slot="icon-only" name="chevron-back-outline"></ion-icon>
          </ion-button>
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
    IonButton,
    IonIcon,
  ],
})
export class SocialDetailPage {
  readonly dataService = inject(DataService);
  private readonly navigationService = inject(NavigationService);

  onBackClicked() {
    this.navigationService.goToPreviousPage();
  }

  async onToggle() {
    await this.dataService.setSocialEnabled(!this.dataService.socialEnabled());
  }
}
