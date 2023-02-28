import { Component } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import * as moment from 'moment';
import { Ingredient } from 'src/app/models/ingredient.model';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-shopping-list',
  templateUrl: 'shopping-list.page.html',
  styleUrls: ['shopping-list.page.scss']
})
export class ShoppingList {

  shoppingList?: Ingredient[];

  constructor(
    private readonly dataService: DataService,
    private readonly loadingController: LoadingController
  ) {}

  ionViewDidEnter() {
    this.getData();
  }

  private async getData() {
    const loading = await this.loadingController.create();
    await loading.present();
    this.getShoppingList().finally(async () => {
      await loading.dismiss();
    });
  }

  async getShoppingList(startDate?: string) {
    if (!startDate) startDate = moment().startOf('week').format("YYYY-MM-DD");
    return this.dataService.getShoppingList(startDate).then(response => {
      this.shoppingList = response;
    })
  }

  async handleRefresh(event: any) {
    await this.getShoppingList();
    event.target.complete();
  }
}
