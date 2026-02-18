import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  IonAvatar,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingService } from 'src/app/services/loading.service';
import {
  HomeNavigationPath,
  NavigationPath,
} from 'src/app/models/navigation-path.enum';
import { UserData } from 'src/app/models/user-data.model';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { trackById } from 'src/app/utils/track-by';

@Component({
  selector: 'app-discover',
  templateUrl: './discover.page.html',
  styleUrls: ['./discover.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonLabel,
    IonList,
    IonItem,
    IonAvatar,
  ],
})
export class DiscoverPage {
  private readonly dataService = inject(DataService);
  private readonly loadingService = inject(LoadingService);
  private readonly navigationService = inject(NavigationService);

  readonly users = signal<UserData[] | undefined>(undefined);

  readonly trackByUser = trackById;

  constructor() {
    this.getData();
  }

  private async getData() {
    await this.loadingService.withLoader(async () => {
      const response = await this.dataService.getUsers();
      this.users.set(response && response.length > 0 ? response : []);
    });
  }

  async onUserClicked(user: UserData) {
    this.navigationService.setRoot([NavigationPath.Base, NavigationPath.User], {
      queryParams: {
        id: user.id,
      },
    });
  }
}
