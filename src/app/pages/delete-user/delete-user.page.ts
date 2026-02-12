import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavigationPath } from 'src/app/models/navigation-path.enum';
import { AlertService } from 'src/app/services/alert.service';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { SessionService } from 'src/app/services/session.service';

@Component({
  selector: 'app-delete-user',
  templateUrl: './delete-user.page.html',
  styleUrls: ['./delete-user.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteUserPage {
  private readonly authService = inject(AuthService);
  private readonly dataService = inject(DataService);
  private readonly alertService = inject(AlertService);
  public readonly sessionService = inject(SessionService);
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
