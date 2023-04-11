import { Component, OnInit } from '@angular/core';
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
})
export class DeleteUserPage implements OnInit {

  constructor(
    private readonly authService: AuthService,
    private readonly dataService: DataService,
    private readonly alertService: AlertService,
    public readonly sessionService: SessionService,
    private readonly navigationService: NavigationService
  ) { }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.sessionService.loginRedirect = undefined;
  }

  async onBackClicked() {
    return this.navigationService.pop();
  }

  async onDeleteClicked() {
    return this.alertService.presentConfirmPopup(
      "DELETE_USER_PAGE.DELETE_POPUP_CONFIRM_MESSAGE",
      async () => {
        await this.dataService.deleteUser();
        await this.authService.signOut();
        this.navigationService.setRoot(NavigationPath.Login);
    });
  }
}
