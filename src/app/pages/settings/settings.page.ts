import { Component, OnInit } from '@angular/core';
import { NavigationPath, SettingsNavigationPath } from 'src/app/models/navigation-path.enum';
import { UserData } from 'src/app/models/user-data.model';
import { AuthService } from 'src/app/services/auth.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { SessionService } from 'src/app/services/session.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  userData: UserData | undefined;

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly navigationService: NavigationService
  ) { }

  ngOnInit() {
    this.userData = this.sessionService.userData;
  }

  async onLogoutClicked() {
    await this.authService.signOut();
    this.navigationService.setRoot(NavigationPath.Login,
      {
        animationDirection: "back"
      }
    );
  }

  async onDeleteClicked() {
    this.navigationService.push(SettingsNavigationPath.DeleteUser);
  }

}
