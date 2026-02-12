import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { NavigationPath } from 'src/app/models/navigation-path.enum';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.page.html',
  styleUrls: ['./not-found.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage implements OnInit {
  private readonly navigationService = inject(NavigationService);

  constructor() {}

  ngOnInit() {}

  async onHomePageClicked() {
    this.navigationService.setRoot([NavigationPath.Base, NavigationPath.Login]);
  }
}
