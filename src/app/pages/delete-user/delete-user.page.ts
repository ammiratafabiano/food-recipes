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
import { NavigationPath } from 'src/app/models/navigation-path.enum';
import { AlertService } from 'src/app/services/alert.service';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-delete-user',
  templateUrl: './delete-user.page.html',
  styleUrls: ['./delete-user.page.scss'],
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
export class DeleteUserPage {
  private readonly authService = inject(AuthService);
  private readonly dataService = inject(DataService);
  private readonly alertService = inject(AlertService);
  private readonly navigationService = inject(NavigationService);

  async onBackClicked() {
    return this.navigationService.pop();
  }

  async onDeleteClicked() {
    return this.alertService.presentConfirmPopup(
      'DELETE_USER_PAGE.DELETE_POPUP_CONFIRM_MESSAGE',
      async () => {
        await this.dataService.deleteUser();
        await this.authService.signOut();
        this.navigationService.setRoot([
          NavigationPath.Base,
          NavigationPath.Login,
        ]);
      },
    );
  }
}
