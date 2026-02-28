import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActionSheetController, AlertController, ModalController } from '@ionic/angular';
import { ItemReorderEventDetail } from '@ionic/core';
import {
  IonButton,
  IonButtons,
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
import { Item } from 'src/app/models/item.model';
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
import { AuthService } from 'src/app/services/auth.service';
import { UserData } from 'src/app/models/user-data.model';
import { NutritionSummaryComponent } from './nutrition-summary/nutrition-summary.modal';

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
    IonButtons,
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
  private readonly alertCtrl = inject(AlertController);
  private readonly modalCtrl = inject(ModalController);
  private readonly translateService = inject(TranslateService);
  private readonly authService = inject(AuthService);

  readonly group = signal<Group | undefined>(undefined);
  readonly planning = signal<Planning | undefined>(undefined);
  readonly dataLoaded = signal<boolean>(false);

  private realtimeSub: import('rxjs').Subscription | null = null;

  private readonly userColors = new Map<string, string>();
  private readonly availableColors = [
    '#FF5733',
    '#33FF57',
    '#3357FF',
    '#FF33A1',
    '#A133FF',
    '#33FFA1',
    '#FF8C33',
    '#33FF8C',
    '#8C33FF',
    '#FF3333',
  ];

  trackByPlanned(index: number, item: PlanningItem) {
    return item.kind === 'recipe' ? item.id : item.day;
  }

  getAssignedUsers(assignedTo?: string): string[] {
    if (!assignedTo) return [];
    return assignedTo.split(',').filter((id) => id.trim() !== '');
  }

  getUserColor(userId: string): string {
    if (!this.userColors.has(userId)) {
      const colorIndex = this.userColors.size % this.availableColors.length;
      this.userColors.set(userId, this.availableColors[colorIndex]);
    }
    return this.userColors.get(userId)!;
  }

  constructor() {}

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
    // Socket lives in the singleton SocketService —
    // don't disconnect here, it would kill it for other pages too.
  }

  async ionViewDidEnter() {
    const week = this.navigationService.getParams<{ week: string }>()?.week;
    const targetStartDate = week || dayjs().startOf('week').format('YYYY-MM-DD');

    // If data is already loaded for the same week, skip HTTP calls entirely
    const alreadyLoaded = this.dataLoaded() && targetStartDate === this.planning()?.startDate;
    if (!alreadyLoaded) {
      await this.getData(week);
    }

    // Connect socket only if the user belongs to a group
    this.ensureRealtimeConnected();
  }

  private ensureRealtimeConnected() {
    const group = this.group();
    if (group) {
      this.dataService.connectRealtime(group);
      this.listenCollaboratorsChanges();
    }
  }

  async onQuickAddClicked() {
    await this.loadingService.withLoader(async () => {
      const foodList = await this.dataService.getFoodList();
      this.navigationService.push('../../' + NavigationPath.ItemSelection, {
        params: {
          title: this.translateService.instant('COMMON.PLANNINGS.ADD_TO_PLANNING.BUTTON'),
          items: foodList?.map((x) => ({ value: x.id, text: x.name })) || [],
        },
        dismissCallback: async (item: Item & { custom?: boolean }) => {
          if (!item) return;

          let foodId = item.value;
          let foodName = item.text;

          if (item.custom) {
            const newFood = await this.dataService.addCustomFood(item.text);
            foodId = newFood.id;
            foodName = newFood.name;
          }

          const currentPlanning = this.planning();
          if (currentPlanning) {
            const result = await this.dataService.quickAddPlanning(
              currentPlanning.startDate,
              foodId,
              foodName,
            );
            // Add the new item directly to the local list instead of refetching
            if (result?.item) {
              const newPlanned: PlannedRecipe = {
                ...result.item,
                kind: 'recipe',
              };
              const newRecipes = [...currentPlanning.recipes];
              // Insert after the first separator (unassigned day) or at top
              const firstSepIdx = newRecipes.findIndex((r) => r.kind === 'separator');
              if (firstSepIdx >= 0) {
                newRecipes.splice(firstSepIdx + 1, 0, newPlanned);
              } else {
                newRecipes.unshift(newPlanned);
              }
              this.planning.set({ ...currentPlanning, recipes: newRecipes });
              this.handleResponse(this.planning());
            }
          }
        },
      });
    });
  }

  private listenCollaboratorsChanges() {
    // Unsubscribe previous subscription to avoid duplicates
    this.realtimeSub?.unsubscribe();
    this.realtimeSub = this.dataService.planningChanges$.subscribe((event) => {
      if (!event) return;
      const { type, planned } = event;
      const currentPlanning = this.planning();
      const currentUser = this.authService.getCurrentUser();

      // Ignore own user's changes (already handled optimistically)
      if (currentUser && planned.user_id === currentUser.id) return;
      if (!currentPlanning) return;

      const isCurrentWeek = currentPlanning.startDate === planned.week;

      switch (type) {
        case 'updated': {
          // Merge changes into the existing local recipe
          const existingIdx = currentPlanning.recipes.findIndex(
            (r) => r.kind === 'recipe' && r.id === planned.id,
          );
          if (existingIdx >= 0) {
            const existing = currentPlanning.recipes[existingIdx] as PlannedRecipe;
            const merged = {
              ...existing,
              day: planned.day ?? existing.day,
              meal: planned.meal ?? existing.meal,
              servings: planned.servings ?? existing.servings,
              assignedTo: planned.assignedTo ?? existing.assignedTo,
            };
            const newRecipes = [...currentPlanning.recipes];
            newRecipes[existingIdx] = merged;
            this.planning.set({ ...currentPlanning, recipes: newRecipes });
            this.sortList();
          }
          break;
        }
        case 'deleted': {
          // Remove the recipe from the local list
          const exists = currentPlanning.recipes.some(
            (r) => r.kind === 'recipe' && r.id === planned.id,
          );
          if (exists) {
            this.planning.set({
              ...currentPlanning,
              recipes: currentPlanning.recipes.filter(
                (r) => r.kind !== 'recipe' || r.id !== planned.id,
              ),
            });
          }
          break;
        }
        case 'added': {
          // For added events, do a targeted refetch (only planning, no group)
          // since the socket payload may not include all recipe details
          if (isCurrentWeek) {
            this.refetchPlanning(currentPlanning.startDate);
          }
          break;
        }
      }
    });
  }

  /** Refetch only the planning list (not the group) without showing the loader */
  private async refetchPlanning(startDate: string) {
    const group = this.group();
    const response = await this.dataService.getPlanning(startDate, group, true);
    this.handleResponse(response);
  }

  private async getData(startDate?: string) {
    const fetchTask = async () => {
      // Only fetch group if not already cached
      let group = this.group();
      if (!group) {
        group = await this.dataService.retrieveGroup();
        this.group.set(group);
      }
      if (!startDate) startDate = dayjs().startOf('week').format('YYYY-MM-DD');
      const response = await this.dataService.getPlanning(startDate, group);
      this.handleResponse(response);
      this.dataLoaded.set(true);
    };

    return this.loadingService.withLoader(fetchTask);
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
        const first = recipes.findIndex((x) => x.kind === 'separator' && x.day == planned.day);
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
      const newDay = ev.detail.to > 0 ? previous?.day : undefined;

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
    await this.refetchPlanning(
      this.planning()?.startDate || dayjs().startOf('week').format('YYYY-MM-DD'),
    );
    const target = event.target as HTMLIonRefresherElement | null;
    target?.complete();
  }

  private sortList() {
    const currentPlanning = this.planning();
    if (!currentPlanning) return;
    const mealIndex = (item: PlanningItem) =>
      item.kind === 'recipe' ? Object.values(Meal).findIndex((x) => x == item.meal) : -1;
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
    const currentPlanning = this.planning();
    if (!currentPlanning) return;

    // Optimistic UI: remove immediately, rollback on error
    const backup = currentPlanning.recipes;
    this.planning.set({
      ...currentPlanning,
      recipes: currentPlanning.recipes.filter(
        (r) => r.kind !== 'recipe' || r.id !== plannedRecipe.id,
      ),
    });

    this.dataService.deletePlanning(plannedRecipe.id).catch(() => {
      this.planning.set({ ...currentPlanning, recipes: backup });
    });
  }

  async onPlanningBackClicked() {
    const startDate = dayjs(this.planning()?.startDate).subtract(1, 'week').format('YYYY-MM-DD');
    this.getData(startDate);
  }

  async onPlanningForwardClicked() {
    const startDate = dayjs(this.planning()?.startDate).add(1, 'week').format('YYYY-MM-DD');
    this.getData(startDate);
  }

  async onPlannedRecipeClicked(plannedRecipe: PlannedRecipe) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translateService.instant('COMMON.PLANNINGS.ADD_TO_PLANNING.CHOICE'),
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

  private servingsUpdateTimeouts = new Map<string, any>();

  private scheduleServingsUpdate(updatedRecipe: PlannedRecipe, backup: PlanningItem[]) {
    const recipeId = updatedRecipe.id;
    if (this.servingsUpdateTimeouts.has(recipeId)) {
      clearTimeout(this.servingsUpdateTimeouts.get(recipeId));
    }

    const timeout = setTimeout(() => {
      this.servingsUpdateTimeouts.delete(recipeId);
      this.dataService.editPlanning(updatedRecipe).then(
        () => {},
        () => {
          const currentPlanning = this.planning();
          if (currentPlanning) {
            this.planning.set({ ...currentPlanning, recipes: backup });
          }
        },
      );
    }, 500);

    this.servingsUpdateTimeouts.set(recipeId, timeout);
  }

  async onIncreaseServings(plannedRecipe: PlannedRecipe) {
    const currentPlanning = this.planning();
    if (!currentPlanning) return;

    const splitServings = plannedRecipe.splitServings || 1;
    const currentServings = plannedRecipe.servings || 1;
    const newServings = currentServings + splitServings;

    const backup = currentPlanning.recipes;
    const updatedRecipe = { ...plannedRecipe, servings: newServings };

    const newRecipes = currentPlanning.recipes.map((r) =>
      r.kind === 'recipe' && r.id === plannedRecipe.id ? updatedRecipe : r,
    );

    this.planning.set({ ...currentPlanning, recipes: newRecipes });
    this.scheduleServingsUpdate(updatedRecipe, backup);
  }

  async onDecreaseServings(plannedRecipe: PlannedRecipe) {
    const currentPlanning = this.planning();
    if (!currentPlanning) return;

    const splitServings = plannedRecipe.splitServings || 1;
    const minServings = plannedRecipe.minServings || 1;
    const currentServings = plannedRecipe.servings || 1;

    const newServings = Math.max(minServings, currentServings - splitServings);
    if (newServings === currentServings) return;

    const backup = currentPlanning.recipes;
    const updatedRecipe = { ...plannedRecipe, servings: newServings };

    const newRecipes = currentPlanning.recipes.map((r) =>
      r.kind === 'recipe' && r.id === plannedRecipe.id ? updatedRecipe : r,
    );

    this.planning.set({ ...currentPlanning, recipes: newRecipes });
    this.scheduleServingsUpdate(updatedRecipe, backup);
  }

  async onServingsClicked(plannedRecipe: PlannedRecipe) {
    const currentPlanning = this.planning();
    if (!currentPlanning) return;

    const alert = await this.alertCtrl.create({
      header: 'Modifica porzioni',
      inputs: [
        {
          name: 'servings',
          type: 'number',
          value: plannedRecipe.servings || 1,
          min: plannedRecipe.minServings || 1,
        },
      ],
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel',
        },
        {
          text: 'Salva',
          role: 'confirm',
        },
      ],
    });

    await alert.present();

    // Auto-focus input and allow Enter to confirm
    const firstInput = alert.querySelector('input');
    if (firstInput) {
      firstInput.focus();
      firstInput.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          const confirmBtn = alert.querySelector(
            '.alert-button-group button:not(.alert-button-role-cancel)',
          ) as HTMLElement | null;
          confirmBtn?.click();
        }
      });
    }

    const { role, data } = await alert.onDidDismiss();

    if (role === 'confirm' && data && data.values && data.values.servings) {
      const newServings = Number(data.values.servings);
      if (newServings === plannedRecipe.servings) return;

      const backup = currentPlanning.recipes;
      const updatedRecipe = { ...plannedRecipe, servings: newServings };

      const newRecipes = currentPlanning.recipes.map((r) =>
        r.kind === 'recipe' && r.id === plannedRecipe.id ? updatedRecipe : r,
      );

      this.planning.set({ ...currentPlanning, recipes: newRecipes });
      this.dataService.editPlanning(updatedRecipe).then(
        () => {},
        () => {
          this.planning.set({ ...currentPlanning, recipes: backup });
        },
      );
    }
  }

  async onAssignClicked(plannedRecipe: PlannedRecipe) {
    const group = this.group();
    if (!group) return;

    const users = await this.dataService.getUsers();
    const currentUser = this.authService.getCurrentUser();
    const allUsers = [...(users || [])];
    if (currentUser) {
      allUsers.push(currentUser);
    }
    const groupUsers = allUsers.filter((u) => group.users.includes(u.id));

    const currentAssigned = this.getAssignedUsers(plannedRecipe.assignedTo);
    // Se non c'è nessuno assegnato (null/vuoto), significa che è per tutti, quindi pre-selezioniamo tutti
    const isAssignedToAll = currentAssigned.length === 0;

    const alert = await this.alertCtrl.create({
      header: 'Assegna a',
      inputs: [
        ...groupUsers.map((u) => ({
          type: 'checkbox' as const,
          label: u.name,
          value: u.id,
          checked: isAssignedToAll || currentAssigned.includes(u.id),
        })),
      ],
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel',
        },
        {
          text: 'Salva',
          role: 'confirm',
        },
      ],
    });

    await alert.present();
    const { role, data } = await alert.onDidDismiss();
    const currentPlanning = this.planning();

    if (role === 'confirm' && currentPlanning && data && data.values) {
      const selectedValues: string[] = data.values;
      let newAssignedTo: string | null = null;

      // Se nessuno è selezionato, non procedere (trattare come annullamento)
      if (selectedValues.length === 0) {
        return;
      }

      // Se tutti sono selezionati, assegniamo a tutti (null)
      if (selectedValues.length === groupUsers.length) {
        newAssignedTo = null;
      } else {
        newAssignedTo = selectedValues.join(',');
      }

      if (plannedRecipe.assignedTo !== newAssignedTo) {
        const backup = currentPlanning.recipes;
        const updatedRecipe = { ...plannedRecipe, assignedTo: newAssignedTo as any };

        const newRecipes = currentPlanning.recipes.map((r) =>
          r.kind === 'recipe' && r.id === plannedRecipe.id ? updatedRecipe : r,
        );

        this.planning.set({ ...currentPlanning, recipes: newRecipes });
        this.dataService.editPlanning(updatedRecipe).then(
          () => {},
          () => {
            this.planning.set({ ...currentPlanning, recipes: backup });
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

  async onNutritionSummaryClicked() {
    const group = this.group();
    const currentPlanning = this.planning();
    if (!currentPlanning) return;

    // Fetch group users for the filter
    let groupUsers: UserData[] = [];
    if (group) {
      const users = await this.dataService.getUsers();
      const currentUser = this.authService.getCurrentUser();
      const allUsers = [...(users || [])];
      if (currentUser) {
        allUsers.push(currentUser);
      }
      groupUsers = allUsers.filter((u) => group.users.includes(u.id));
    }

    const modal = await this.modalCtrl.create({
      component: NutritionSummaryComponent,
      componentProps: {
        week: currentPlanning.startDate,
        group,
        groupUsers,
      },
    });
    await modal.present();
  }
}
