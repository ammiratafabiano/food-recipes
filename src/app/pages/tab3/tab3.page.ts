import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ItemReorderEventDetail } from '@ionic/core';
import { Planning } from 'src/app/models/planning.model';
import { Recipe } from 'src/app/models/recipe.model';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page {

  planning: Planning[] = [];
  currentPlanning?: Planning;

  recipeToMove?: Recipe;

  constructor(
    private readonly dataService: DataService,
    private readonly route: ActivatedRoute,
  ) {
    this.getData();
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params && params['recipe']) {
        this.recipeToMove = JSON.parse(params['recipe']);
      }
    });
  }

  private getData() {
    //this.planning = this.dataService.getPlanning(); // TODO
    this.currentPlanning = this.planning && this.planning[0];
  }

  handleReorder(ev: CustomEvent<ItemReorderEventDetail>) {
    const element = this.currentPlanning?.recipes[ev.detail.from];
    if (this.currentPlanning && element) {
      this.currentPlanning.recipes.splice(ev.detail.from, 1);
      this.currentPlanning.recipes.splice(ev.detail.to, 0, element);
      this.currentPlanning.recipes[ev.detail.to].day = ev.detail.to > 0 ? this.currentPlanning.recipes[ev.detail.to - 1].day : undefined;
    }
    ev.detail.complete();
  }

}
