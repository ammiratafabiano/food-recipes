import { Component, OnInit } from '@angular/core';
import { NavigationPath } from 'src/app/models/navigation-path.enum';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.page.html',
  styleUrls: ['./not-found.page.scss'],
})
export class NotFoundPage implements OnInit {

  constructor(private readonly navigationService: NavigationService) { }

  ngOnInit() {
  }
  
  async onHomePageClicked() {
    this.navigationService.setRoot(NavigationPath.Login);
  }
}
