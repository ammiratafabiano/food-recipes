import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { NavigationPath, SettingsNavigationPath } from 'src/app/models/navigation-path.enum';
import { UserData } from 'src/app/models/user-data.model';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  userData: UserData | undefined;

  constructor(
    private readonly authService: AuthService,
    private readonly navigationService: NavigationService,
    private readonly loadingController: LoadingController,
    private readonly dataService: DataService
  ) { }

  ngOnInit() {
    this.userData = this.authService.getCurrentUser();
    this.getUserStats();
  }

  private async getUserStats() {
    const loading = await this.loadingController.create()
    await loading.present()
    if (this.userData) this.userData.stats = await this.dataService.getUserStats();
    await loading.dismiss();
  }

  async handleRefresh(event: any) {
    await this.getUserStats();
    event.target.complete();
  }

  async onLogoutClicked() {
    await this.authService.signOut();
    this.navigationService.setRoot([NavigationPath.Base, NavigationPath.Login],
      {
        animationDirection: "back"
      }
    );
  }

  async onDeleteClicked() {
    this.navigationService.push(SettingsNavigationPath.DeleteUser);
  }

}
