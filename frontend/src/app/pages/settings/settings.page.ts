import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import {
  IonAvatar,
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingService } from 'src/app/services/loading.service';
import { ModalController } from '@ionic/angular';
import { NavigationPath, SettingsNavigationPath } from 'src/app/models/navigation-path.enum';
import { UserData } from 'src/app/models/user-data.model';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { ProfileSurveyComponent } from '../planning/nutrition-summary/profile-survey.modal';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonLabel,
    IonList,
    IonItem,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonCardTitle,
    IonCardSubtitle,
    IonAvatar,
    IonBadge,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class SettingsPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly navigationService = inject(NavigationService);
  private readonly loadingService = inject(LoadingService);
  readonly dataService = inject(DataService);
  private readonly modalCtrl = inject(ModalController);

  readonly userData = signal<UserData | undefined>(undefined);

  constructor() {}

  ngOnInit() {
    this.userData.set(this.authService.getCurrentUser());
    this.getUserStats();
  }

  private async getUserStats() {
    await this.loadingService.withLoader(async () => {
      const user = this.userData();
      if (user) {
        const stats = await this.dataService.getUserStats();
        this.userData.set({ ...user, stats });
      }
    });
  }

  async handleRefresh(event: Event) {
    await this.getUserStats();
    const target = event.target as HTMLIonRefresherElement | null;
    target?.complete();
  }

  async onGroupManagementClicked() {
    this.navigationService.push(SettingsNavigationPath.GroupManagement);
  }

  async onLogoutClicked() {
    await this.authService.signOut();
    this.navigationService.setRoot([NavigationPath.Base, NavigationPath.Login], {
      animationDirection: 'back',
    });
  }

  async onDeleteClicked() {
    this.navigationService.push(SettingsNavigationPath.DeleteUser);
  }

  async onNutritionProfileClicked() {
    const modal = await this.modalCtrl.create({
      component: ProfileSurveyComponent,
    });
    await modal.present();
  }

  onPlanningDetailClicked() {
    this.navigationService.push(SettingsNavigationPath.PlanningDetail);
  }

  onSocialDetailClicked() {
    this.navigationService.push(SettingsNavigationPath.SocialDetail);
  }
}
