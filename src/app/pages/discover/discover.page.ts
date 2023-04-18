import { Component } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { HomeNavigationPath, NavigationPath } from 'src/app/models/navigation-path.enum';
import { UserData } from 'src/app/models/user-data.model';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-discover',
  templateUrl: './discover.page.html',
  styleUrls: ['./discover.page.scss'],
})
export class DiscoverPage {

  users?: UserData[];

  constructor(
    private readonly dataService: DataService,
    private readonly loadingController: LoadingController,
    private readonly navigationService: NavigationService
  ) {
    this.getData();
  }

  private async getData() {
    const loading = await this.loadingController.create();
    await loading.present();
    this.dataService.getUsers().then(response => {
      if (response && response.length > 0) {
        this.users = response;
      } else {
        this.users = [];
      }
    }).finally(async () => {
      await loading.dismiss();
    });
  }

  async onUserClicked(user: UserData) {
    this.navigationService.setRoot([NavigationPath.Base, NavigationPath.User],
      {
        queryParams: {
          id: user.id
        }
      }
    );
  }
}
