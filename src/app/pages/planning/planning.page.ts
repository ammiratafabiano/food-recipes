import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActionSheetController } from '@ionic/angular';
import { ItemReorderEventDetail } from '@ionic/core';
import {
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonReorder,
  IonReorderGroup,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs';
import {
  PlannedRecipe,
  Planning,
  PlanningItem,
  PlanningSeparator,
} from 'src/app/models/planning.model';
import { DataService } from 'src/app/services/data.service';
import { WeekDay } from 'src/app/models/weekDay.enum';
import { NavigationService } from 'src/app/services/navigation.service';
import { Meal } from 'src/app/models/meal.model';
import { Group } from 'src/app/models/group.model';
import {
  HomeNavigationPath,
  NavigationPath,
  SettingsNavigationPath,
} from 'src/app/models/navigation-path.enum';
import { createPlanning } from 'src/app/utils/model-factories';
import { LoadingService } from 'src/app/services/loading.service';

@Component({
  selector: 'app-planning',
  templateUrl: 'planning.page.html',
  styleUrls: ['planning.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    DatePipe,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonLabel,
    IonList,
    IonItem,
    IonItemSliding,
    IonItemOption,
    IonItemOptions,
    IonButton,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonReorderGroup,
    IonReorder,
  ],
})
export class PlanningPage implements OnDestroy {
  private readonly dataService = inject(DataService);
  private readonly loadingService = inject(LoadingService);
  private readonly navigationService = inject(NavigationService);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly translateService = inject(TranslateService);

  readonly group = signal<Group | undefined>(undefined);
  readonly planning = signal<Planning | undefined>(undefined);
  readonly dataLoaded = signal<boolean>(false);

  trackByPlanned(index: number, item: PlanningItem) {
    return item.kind === 'recipe' ? item.id : item.day;
  }

  constructor() {}

  ngOnDestroy(): void {
    this.dataService.unsubscribeToPlanning();
  }

  async ionViewDidEnter() {
    this.dataLoaded.set(false);
    const week = this.navigationService.getParams<{ week: string }>()?.week;
    await this.getData(week);
    const group = this.group();
    group && this.listenCollaboratorsChanges(group);
  }

  private listenCollaboratorsChanges(group: Group) {
    this.dataService.subscribeToPlannings(group).subscribe((planned) => {
      const currentPlanning = this.planning();
      if (planned && currentPlanning) {
        const updated =
          currentPlanning.startDate &&
          currentPlanning.startDate == planned.week;
        const deleted =
          !updated &&
          currentPlanning.recipes.find(
            (x) => x.kind === 'recipe' && x.id == planned.id,
          );
        if (updated || deleted) {
          this.getData(currentPlanning.startDate);
        }
      }
    });
  }

  private async getData(startDate?: string) {
    return this.loadingService.withLoader(async () => {
      const group = await this.dataService.retrieveGroup();
      this.group.set(group);
      if (!startDate) startDate = dayjs().startOf('week').format('YYYY-MM-DD');
      const response = await this.dataService.getPlanning(startDate, group);
      this.handleResponse(response);
      this.dataLoaded.set(true);
    });
  }

  private handleResponse(response: Planning | undefined) {
    if (!response) return;

    const recipes: PlanningItem[] = [
      { kind: 'separator', day: WeekDay.Monday },
      { kind: 'separator', day: WeekDay.Tuesday },
      { kind: 'separator', day: WeekDay.Wednesday },
      { kind: 'separator', day: WeekDay.Thursday },
      { kind: 'separator', day: WeekDay.Friday },
      { kind: 'separator', day: WeekDay.Saturday },
      { kind: 'separator', day: WeekDay.Sunday },
    ];

    response.recipes.forEach((planned) => {
      if (planned.day) {
        const first = recipes.findIndex(
          (x) => x.kind === 'separator' && x.day == planned.day,
        );
        recipes.splice(first + 1, 0, planned);
      } else {
        recipes.unshift(planned);
      }
    });

    this.planning.set({
      ...createPlanning(),
      startDate: response.startDate,
      recipes,
    });
  }

  handleReorder(ev: CustomEvent<ItemReorderEventDetail>) {
    const currentPlanning = this.planning();
    const element = currentPlanning?.recipes[ev.detail.from];
    if (currentPlanning && element && element.kind === 'recipe') {
      const backup = [...currentPlanning.recipes];
      const newRecipes = [...currentPlanning.recipes];
      newRecipes.splice(ev.detail.from, 1);
      newRecipes.splice(ev.detail.to, 0, element);

      const previous = newRecipes[ev.detail.to - 1];
      const newDay =
        ev.detail.to > 0 && previous?.kind === 'separator'
          ? previous.day
          : element.day;

      const updatedElement = { ...element, day: newDay };
      newRecipes[ev.detail.to] = updatedElement;

      this.planning.set({ ...currentPlanning, recipes: newRecipes });

      this.dataService.editPlanning(updatedElement).then(
        () => {},
        () => {
          this.planning.set({ ...currentPlanning, recipes: backup });
        },
      );
    }
    ev.detail.complete();
  }

  async handleRefresh(event: CustomEvent) {
    await this.getData(this.planning()?.startDate);
    const target = event.target as HTMLIonRefresherElement | null;
    target?.complete();
  }

  private sortList() {
    const currentPlanning = this.planning();
    if (!currentPlanning) return;
    const mealIndex = (item: PlanningItem) =>
      item.kind === 'recipe'
        ? Object.values(Meal).findIndex((x) => x == item.meal)
        : -1;
    const sortedRecipes = [...currentPlanning.recipes].sort((a, b) => {
      if (a.day == b.day) {
        const index1 = mealIndex(a);
        const index2 = mealIndex(b);
        return index1 > index2 ? 1 : index1 < index2 ? -1 : 0;
      }
      return 0;
    });
    this.planning.set({ ...currentPlanning, recipes: sortedRecipes });
  }

  async onRemoveRecipeClicked(plannedRecipe: PlannedRecipe) {
    await this.loadingService.withLoader(async () => {
      await this.dataService.deletePlanning(plannedRecipe.id);
      const currentPlanning = this.planning();
      if (currentPlanning) {
        this.planning.set({
          ...currentPlanning,
          recipes: currentPlanning.recipes.filter(
            (r) => r.kind !== 'recipe' || r.id !== plannedRecipe.id,
          ),
        });
      }
    });
  }

  async onPlanningBackClicked() {
    const startDate = dayjs(this.planning()?.startDate)
      .subtract(1, 'week')
      .format('YYYY-MM-DD');
    this.getData(startDate);
  }

  async onPlanningForwardClicked() {
    const startDate = dayjs(this.planning()?.startDate)
      .add(1, 'week')
      .format('YYYY-MM-DD');
    this.getData(startDate);
  }

  async onPlannedRecipeClicked(plannedRecipe: PlannedRecipe) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translateService.instant(
        'COMMON.PLANNINGS.ADD_TO_PLANNING.CHOICE',
      ),
      buttons: [
        ...Object.values(Meal).map((x) => {
          return {
            text: this.translateService.instant('COMMON.MEAL_TYPE.' + x),
            data: {
              action: x,
            },
          };
        }),
        {
          text: this.translateService.instant('PLANNING_PAGE.MEAL_RESET'),
          data: {
            action: undefined,
          },
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
    const result = await actionSheet.onDidDismiss();
    const currentPlanning = this.planning();
    if (result?.data && currentPlanning) {
      if (plannedRecipe.meal != result.data.action) {
        const backup = currentPlanning.recipes;
        const updatedRecipe = { ...plannedRecipe, meal: result.data.action };

        const newRecipes = currentPlanning.recipes.map((r) =>
          r.kind === 'recipe' && r.id === plannedRecipe.id ? updatedRecipe : r,
        );

        this.planning.set({ ...currentPlanning, recipes: newRecipes });
        this.sortList();
        this.dataService.editPlanning(updatedRecipe).then(
          () => {},
          () => {
            this.planning.set({ ...currentPlanning, recipes: backup });
            this.sortList();
          },
        );
      }
    }
  }

  async onGoToGroupManagementClicked() {
    this.navigationService.setRoot([
      NavigationPath.Base,
      NavigationPath.Home,
      HomeNavigationPath.Settings,
      SettingsNavigationPath.GroupManagement,
    ]);
  }
}
