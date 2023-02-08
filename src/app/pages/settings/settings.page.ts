import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  constructor(
    private authService: AuthService,
    private router: Router,
    private navCtrl: NavController
  ) { }

  ngOnInit() {
  }

  async onLogoutClicked() {
    await this.authService.signOut();
    this.navCtrl.navigateBack(['/login'])
  }

}
