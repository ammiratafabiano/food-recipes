import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { LoadingService } from 'src/app/services/loading.service';
import { Item } from 'src/app/models/item.model';
import { Group } from 'src/app/models/group.model';

export interface MealSuggestion {
  recipe_id: string;
  recipe_name: string;
  recipe_type: string;
  frequency: number;
  last_used_week: string;
  meals_used: string[];
}

export interface PlanningAddResult {
  type: 'suggestion' | 'ingredient';
  suggestion?: MealSuggestion;
  ingredient?: Item & { custom?: boolean };
}

@Component({
  selector: 'app-planning-add',
  templateUrl: 'planning-add.page.html',
  styleUrls: ['planning-add.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonItem,
    IonItemSliding,
    IonItemOption,
    IonItemOptions,
    IonLabel,
    IonList,
  ],
})
export class PlanningAddPage implements OnInit {
  private readonly dataService = inject(DataService);
  private readonly navigationService = inject(NavigationService);
  private readonly loadingService = inject(LoadingService);
  private readonly translateService = inject(TranslateService);

  readonly allSuggestions = signal<MealSuggestion[]>([]);
  readonly suggestions = computed(() => this.allSuggestions().slice(0, 5));
  readonly loading = signal<boolean>(true);

  private week!: string;
  private group?: Group;

  ngOnInit() {
    const params = this.navigationService.getParams<{
      week: string;
      group?: Group;
    }>();
    if (!params) {
      this.navigationService.pop();
      return;
    }
    this.week = params.week;
    this.group = params.group;
    this.loadSuggestions();
  }

  private async loadSuggestions() {
    const groupId = this.group?.id;
    const data = await this.dataService.getPlanningSuggestions(this.week, groupId);
    this.allSuggestions.set(data);
    this.loading.set(false);
  }

  getMealsLabel(meals: string[]): string {
    if (!meals || meals.length === 0) return '';
    return meals.map((m) => this.translateService.instant('COMMON.MEAL_TYPE.' + m)).join(', ');
  }

  async onDismissClicked(suggestion: MealSuggestion) {
    this.allSuggestions.update((list) => list.filter((s) => s.recipe_id !== suggestion.recipe_id));
    await this.dataService.dismissSuggestion(this.week, suggestion.recipe_id);
  }

  onAddSuggestionClicked(suggestion: MealSuggestion) {
    const result: PlanningAddResult = { type: 'suggestion', suggestion };
    this.navigationService.pop(result);
  }

  async onSelectIngredientClicked() {
    await this.loadingService.withLoader(async () => {
      const foodList = await this.dataService.getFoodList();
      this.navigationService.push('item-selection', {
        params: {
          title: this.translateService.instant('COMMON.PLANNINGS.ADD_TO_PLANNING.BUTTON'),
          items: foodList?.map((x) => ({ value: x.id, text: x.name })) || [],
        },
        dismissCallback: (item: Item & { custom?: boolean }) => {
          if (!item) return;
          const result: PlanningAddResult = { type: 'ingredient', ingredient: item };
          setTimeout(() => {
            this.navigationService.pop(result);
          }, 300);
        },
      });
    });
  }

  onBackClicked() {
    this.navigationService.pop();
  }
}
