import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { UserData } from 'src/app/models/user-data.model';
import { AuthService } from 'src/app/services/auth.service';
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
    private readonly sessionService: SessionService
  ) { }

  ngOnInit() {
    this.userData = this.sessionService.userData;
  }

  async onLogoutClicked() {
    await this.authService.signOut();
    this.navCtrl.navigateBack(['/login'])
  }

}
