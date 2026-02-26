import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { NavigationPath } from 'src/app/models/navigation-path.enum';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.page.html',
  styleUrls: ['./not-found.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [TranslateModule, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel],
})
export class NotFoundPage {
  private readonly navigationService = inject(NavigationService);

  async onHomePageClicked() {
    this.navigationService.setRoot([NavigationPath.Base, NavigationPath.Login]);
  }
}
