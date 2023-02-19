import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { ItemReorderEventDetail } from '@ionic/core';
import * as moment from 'moment';
import { PlannedRecipe, Planning } from 'src/app/models/planning.model';
import { Recipe } from 'src/app/models/recipe.model';
import { DataService } from 'src/app/services/data.service';
import { WeekDay } from "src/app/models/weekDay.enum";

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page implements OnInit {

  planning?: Planning;

  recipeToMove?: Recipe;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly loadingController: LoadingController
  ) {
    this.getData();
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params && params['refresh']) {
        const params = { ...this.route.snapshot.queryParams };
        delete params.refresh;
        this.router.navigate([], { queryParams: params });
        this.getData();
      }
    });
  }

  private async getData() {
    const loading = await this.loadingController.create();
    await loading.present();
    const startDate = moment().startOf('week').format("YYYY-MM-DD");
    this.dataService.getPlanning(startDate).then(response => {
      this.handleResponse(response);
    }).finally(async () => {
      await loading.dismiss();
    });
  }

  private handleResponse(response: Planning | undefined) {
    if (!response) return;
    this.planning = new Planning;
    this.planning.recipes = [
      { day: WeekDay.Monday },
      { day: WeekDay.Tuesday },
      { day: WeekDay.Wednesday },
      { day: WeekDay.Thursday },
      { day: WeekDay.Friday },
      { day: WeekDay.Saturday },
      { day: WeekDay.Sunday }
    ]
    response.recipes.forEach(planned => {
      if (this.planning) {
        if (planned.day) {
          const first = this.planning?.recipes.findIndex(x => x.day == planned.day);
          this.planning.recipes.splice(first, 0, planned);
        } else {
          this.planning.recipes.unshift(planned);
        }
      }
    })
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

  async onRemoveRecipeClicked(plannedRecipe: PlannedRecipe) {
    if (!plannedRecipe.id) return;
    const loading = await this.loadingController.create();
    await loading.present();
    await this.dataService.removeFromPlanning(plannedRecipe.id);
    await loading.dismiss();
  }
}
