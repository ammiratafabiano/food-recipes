import { Component, OnInit } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';
import { UserData } from 'src/app/models/user-data.model';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
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
    private readonly navCtrl: NavController,
    private readonly sessionService: SessionService,
    private readonly dataService: DataService,
    private readonly alertController: AlertController
  ) { }

  ngOnInit() {
    this.userData = this.sessionService.userData;
  }

  async onLogoutClicked() {
    await this.authService.signOut();
    this.navCtrl.navigateBack("/login");
  }

  async onDeleteClicked() {
    this.navCtrl.navigateForward("/delete-user");
  }

}
