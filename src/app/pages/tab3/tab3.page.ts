import { Component } from '@angular/core';
import { ItemReorderEventDetail } from '@ionic/core';
import * as moment from 'moment';
import { Planning } from 'src/app/models/planning.model';
import { Recipe } from 'src/app/models/recipe.model';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page {

  planning?: Planning;

  recipeToMove?: Recipe;

  constructor(
    private readonly dataService: DataService
  ) {
    this.getData();
  }

  private async getData() {
    const startDate = moment().toLocaleString();
    this.planning = await this.dataService.getPlanning(startDate);
  }

  handleReorder(ev: CustomEvent<ItemReorderEventDetail>) {
    const element = this.planning?.recipes[ev.detail.from];
    if (this.planning && element) {
      this.planning.recipes.splice(ev.detail.from, 1);
      this.planning.recipes.splice(ev.detail.to, 0, element);
      this.planning.recipes[ev.detail.to].day = ev.detail.to > 0 ? this.planning.recipes[ev.detail.to - 1].day : undefined;
    }
    ev.detail.complete();
  }

}
