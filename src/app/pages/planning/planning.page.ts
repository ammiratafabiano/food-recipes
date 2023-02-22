import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { ItemReorderEventDetail } from '@ionic/core';
import * as moment from 'moment';
import { PlannedRecipe, Planning } from 'src/app/models/planning.model';
import { DataService } from 'src/app/services/data.service';
import { WeekDay } from "src/app/models/weekDay.enum";

@Component({
  selector: 'app-planning',
  templateUrl: 'planning.page.html',
  styleUrls: ['planning.page.scss']
})
export class PlanningPage implements OnInit {

  planning?: Planning;

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
      if (params && params['week']) {
        this.getPlanning(params['week']);
        this.removeNavigationParams(['week']);
      }
    });
  }

  private removeNavigationParams(list: string[]) {
    const params = { ...this.route.snapshot.queryParams };
    list.forEach(x => delete params[x]);
    this.router.navigate([], { queryParams: params });
  }

  private async getData() {
    const loading = await this.loadingController.create();
    await loading.present();
    this.getPlanning().finally(async () => {
      await loading.dismiss();
    });
  }

  private async getPlanning(startDate?: string) {
    if (!startDate) startDate = moment().startOf('week').format("YYYY-MM-DD");
    return this.dataService.getPlanning(startDate).then(response => {
      this.handleResponse(response);
    });
  }

  private handleResponse(response: Planning | undefined) {
    if (!response) return;
    this.planning = new Planning;
    this.planning.startDate = response.startDate;
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
    await this.dataService.deletePlanning(plannedRecipe.id);
    await this.getPlanning(this.planning?.startDate)
    await loading.dismiss();
  }

  async onPlanningBackClicked() {
    const startDate = moment(this.planning?.startDate).subtract(1, 'week').format("YYYY-MM-DD");
    this.getPlanning(startDate);
  }

  async onPlanningForwardClicked() {
    const startDate = moment(this.planning?.startDate).add(1, 'week').format("YYYY-MM-DD");
    this.getPlanning(startDate);
  }

  async handleRefresh(event: any) {
    await this.getPlanning(this.planning?.startDate);
    event.target.complete();
  }
}
