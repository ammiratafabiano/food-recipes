import { Component, OnInit } from '@angular/core';
import { NavController, AlertController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SessionService } from 'src/app/services/session.service';

@Component({
  selector: 'app-delete-user',
  templateUrl: './delete-user.page.html',
  styleUrls: ['./delete-user.page.scss'],
})
export class DeleteUserPage implements OnInit {

  constructor(
    private readonly authService: AuthService,
    private readonly navCtrl: NavController,
    private readonly dataService: DataService,
    private readonly alertController: AlertController,
    private readonly sessionService: SessionService
  ) { }

  ngOnInit() {
  }

  ionViewDidEnter() {
    this.sessionService.loginRedirect = undefined;
  }

  async onDeleteClicked() {
    const alert = await this.alertController.create({
      header: "Attenzione",
      message: "Vuoi davvero cancellare il tuo account?",
      buttons: [
        {
          text: "Cancel"
        },
        {
          text: "Ok",
          handler: async () => {
            await this.dataService.deleteUser();
            await this.authService.resetUser();
            this.navCtrl.navigateBack("/login");
          }
        }
      ],
    })
    await alert.present();
  }

}
