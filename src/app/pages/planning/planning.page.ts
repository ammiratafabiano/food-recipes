import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActionSheetController, LoadingController } from '@ionic/angular';
import { ItemReorderEventDetail } from '@ionic/core';
import * as moment from 'moment';
import { PlannedRecipe, Planning } from 'src/app/models/planning.model';
import { DataService } from 'src/app/services/data.service';
import { WeekDay } from "src/app/models/weekDay.enum";
import { NavigationService } from 'src/app/services/navigation.service';
import { TranslateService } from '@ngx-translate/core';
import { Meal } from 'src/app/models/meal.model';
import { Group } from 'src/app/models/group.model';
import { HomeNavigationPath, NavigationPath, SettingsNavigationPath } from 'src/app/models/navigation-path.enum';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-planning',
  templateUrl: 'planning.page.html',
  styleUrls: ['planning.page.scss']
})
export class PlanningPage implements OnDestroy {

  group?: Group;
  planning?: Planning;

  dataLoaded = new Subject<boolean>();

  constructor(
    private readonly dataService: DataService,
    private readonly loadingController: LoadingController,
    private readonly navigationService: NavigationService,
    private readonly actionSheetCtrl: ActionSheetController,
    private readonly translateService: TranslateService
  ) {}

  ngOnDestroy(): void {
    this.dataService.unsubscribeToPlanning();
  }

  async ionViewDidEnter() {
    this.dataLoaded.next(false);
    const week = this.navigationService.getParams<{week: string}>()?.week;
    await this.getData(week);
    this.group && this.listenCollaboratorsChanges(this.group);
  }

  private listenCollaboratorsChanges(group: Group) {
    this.dataService.subscribeToPlannings(group).subscribe((planned) => {
      if (planned) {
        const updated = this.planning?.startDate && this.planning.startDate == planned.week;
        const deleted = !updated && this.planning?.recipes.find(x => x.id == planned.id);
        if (updated || deleted) {
          this.getData(this.planning?.startDate);
        }
      }
    });
  }

  private async getData(startDate?: string) {
    const loading = await this.loadingController.create();
    await loading.present();
    this.group = await this.dataService.retrieveGroup();
    if (!startDate) startDate = moment().startOf('week').format("YYYY-MM-DD");
    return this.dataService.getPlanning(startDate, this.group).then(response => {
      this.handleResponse(response);
    }).finally(async () => {
      await loading.dismiss();
      this.dataLoaded.next(true);
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
          this.planning.recipes.splice(first + 1, 0, planned);
        } else {
          this.planning.recipes.unshift(planned);
        }
      }
    })
  }

  handleReorder(ev: CustomEvent<ItemReorderEventDetail>) {
    const element = this.planning?.recipes[ev.detail.from];
    if (this.planning && element) {
      const backup = Object.assign(this.planning.recipes);
      this.planning.recipes.splice(ev.detail.from, 1);
      this.planning.recipes.splice(ev.detail.to, 0, element);
      this.planning.recipes[ev.detail.to].day = ev.detail.to > 0 ? this.planning.recipes[ev.detail.to - 1].day : undefined;
      this.dataService.editPlanning(this.planning.recipes[ev.detail.to]).then(
        () => {},
        () => {
          if (this.planning) this.planning.recipes = backup;
        }
      )
    }
    ev.detail.complete();
  }

  async handleRefresh(event: any) {
    await this.getData(this.planning?.startDate);
    event.target.complete();
  }

  private sortList() {
    if (!this.planning) return;
    this.planning.recipes = this.planning.recipes.sort((p1, p2) => {
      const index1 = Object.values(Meal).findIndex(x => x == p1.meal);
      const index2 = Object.values(Meal).findIndex(x => x == p2.meal);
      return (p1.day == p2.day && index1 > index2) ? 1 : (p1.day == p2.day && index1 < index2) ? -1 : 0;
    });
  }

  async onRemoveRecipeClicked(plannedRecipe: PlannedRecipe) {
    if (!plannedRecipe.id) return;
    const loading = await this.loadingController.create();
    await loading.present();
    await this.dataService.deletePlanning(plannedRecipe.id);
    await loading.dismiss();
  }

  async onPlanningBackClicked() {
    const startDate = moment(this.planning?.startDate).subtract(1, 'week').format("YYYY-MM-DD");
    this.getData(startDate);
  }

  async onPlanningForwardClicked() {
    const startDate = moment(this.planning?.startDate).add(1, 'week').format("YYYY-MM-DD");
    this.getData(startDate);
  }

  async onPlannedRecipeClicked(plannedRecipe: PlannedRecipe) {
    if (!plannedRecipe.id) return;
  
    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translateService.instant("COMMON.PLANNINGS.ADD_TO_PLANNING.CHOICE"),
      buttons: [
        ...Object.values(Meal).map(x => {
          return {
            text: this.translateService.instant("COMMON.MEAL_TYPE." + x),
            data: {
              action: x
            }
          }
        }),
        {
          text: this.translateService.instant("PLANNING_PAGE.MEAL_RESET"),
          data: {
            action: undefined
          },
          role: 'cancel'
        }
      ],
    });
    await actionSheet.present();
    const result = await actionSheet.onDidDismiss();
    if (result?.data) {
      if (plannedRecipe.meal != result.data.action) {
        const backup = plannedRecipe.meal;
        plannedRecipe.meal = result?.data?.action;
        this.sortList();
        this.dataService.editPlanning(plannedRecipe).then(
          () => {},
          () => {
            plannedRecipe.meal = backup;
            this.sortList();
          }
        )
      }
    }
  }

  async onGoToGroupManagementClicked() {
    this.navigationService.setRoot([NavigationPath.Base, NavigationPath.Home, HomeNavigationPath.Settings, SettingsNavigationPath.GroupManagement]);
  }
}
