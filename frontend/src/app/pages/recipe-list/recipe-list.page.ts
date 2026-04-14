import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SearchbarCustomEvent } from '@ionic/angular';
import {
  IonButton,
  IonChip,
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
  IonPopover,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs';
import {
  HomeNavigationPath,
  NavigationPath,
  SettingsNavigationPath,
  RecipeListNavigationPath,
} from 'src/app/models/navigation-path.enum';
import { RecipeTagFilter } from 'src/app/models/recipe-tag-filter.model';
import { RecipeTypeFilter } from 'src/app/models/recipe-type-filter.model';
import { RecipeType } from 'src/app/models/recipe-type.enum';
import { Recipe } from 'src/app/models/recipe.model';
import { AlertService } from 'src/app/services/alert.service';
import { DataService } from 'src/app/services/data.service';
import { LoadingService } from 'src/app/services/loading.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { createRecipeTagFilter, createRecipeTypeFilter } from 'src/app/utils/model-factories';
import { trackById, trackByType } from 'src/app/utils/track-by';

@Component({
  selector: 'app-recipe-list',
  templateUrl: 'recipe-list.page.html',
  styleUrls: ['recipe-list.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
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
    IonSearchbar,
    IonPopover,
    IonChip,
  ],
})
export class RecipeListPage {
  readonly dataService = inject(DataService);
  private readonly loadingService = inject(LoadingService);
  private readonly translateService = inject(TranslateService);
  private readonly navigationService = inject(NavigationService);
  private readonly alertService = inject(AlertService);

  readonly recipes = signal<Recipe[] | undefined>(undefined);
  readonly othersRecipes = signal<Recipe[] | undefined>(undefined);
  readonly groupRecipes = signal<Recipe[] | undefined>(undefined);

  readonly searchQuery = signal<string>('');

  readonly displayRecipes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const recipes = this.recipes();
    const activeFilters = this.recipeTypeFilters()
      .filter((f) => f.enabled)
      .map((f) => f.type);

    return recipes
      ?.filter((x) => {
        const matchQuery = x.name.toLowerCase().indexOf(query) > -1;
        const matchFilter =
          activeFilters.length === 0 || (!!x.type && activeFilters.includes(x.type));
        const notProduct = x.type !== RecipeType.Product;
        return matchQuery && matchFilter && notProduct;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly displayOthersRecipes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const recipes = this.othersRecipes();
    const activeFilters = this.recipeTypeFilters()
      .filter((f) => f.enabled)
      .map((f) => f.type);

    return recipes
      ?.filter((x) => {
        const matchQuery = x.name.toLowerCase().indexOf(query) > -1;
        const matchFilter =
          activeFilters.length === 0 || (!!x.type && activeFilters.includes(x.type));
        const notProduct = x.type !== RecipeType.Product;
        return matchQuery && matchFilter && notProduct;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly displayGroupRecipes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const recipes = this.groupRecipes();
    const activeFilters = this.recipeTypeFilters()
      .filter((f) => f.enabled)
      .map((f) => f.type);

    return recipes
      ?.filter((x) => {
        const matchQuery = x.name.toLowerCase().indexOf(query) > -1;
        const matchFilter =
          activeFilters.length === 0 || (!!x.type && activeFilters.includes(x.type));
        return matchQuery && matchFilter;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // Filters
  readonly recipeTypeFilters = signal<RecipeTypeFilter[]>([]);
  readonly recipeTagFilters = signal<RecipeTagFilter[]>([]);

  readonly trackByRecipe = trackById;
  readonly trackByRecipeType = trackByType;

  constructor() {
    this.getData();
  }

  private async getData() {
    await this.loadingService.withLoader(async () => {
      const recipes = (await this.dataService.getRecipeList()) || [];
      const othersRecipes = (await this.dataService.getSavedRecipeList()) || [];
      const groupRecipes = (await this.dataService.getGroupRecipeList()) || [];
      this.recipes.set(recipes);
      this.othersRecipes.set(othersRecipes);
      this.groupRecipes.set(groupRecipes);
      this.initFilters();
    });
  }

  private initFilters() {
    const allRecipes = (this.recipes() || [])
      .concat(this.othersRecipes() || [])
      .concat(this.groupRecipes() || []);
    // Init types
    const newTypeFilters: RecipeTypeFilter[] = [];
    Object.values(RecipeType).forEach((x) => {
      if (x !== RecipeType.Product && allRecipes.find((y) => y.type == x)) {
        newTypeFilters.push(createRecipeTypeFilter({ type: x }));
      }
    });
    this.recipeTypeFilters.set(newTypeFilters);

    // Init tags
    const newTagFilters: RecipeTagFilter[] = [];
    allRecipes.forEach((x) => {
      x?.tags?.forEach((y) => {
        if (!newTagFilters.find((z) => z.tag == y)) {
          newTagFilters.push(createRecipeTagFilter({ tag: y }));
        }
      });
    });
    this.recipeTagFilters.set(newTagFilters);
  }

  onTypeClicked(recipeType: RecipeTypeFilter) {
    this.recipeTypeFilters.update((filters) =>
      filters.map((f) => (f.type === recipeType.type ? { ...f, enabled: !f.enabled } : f)),
    );
  }

  onSearchChange(event: SearchbarCustomEvent) {
    this.searchQuery.set(event.detail?.value || '');
  }

  async onRecipeClicked(recipe: Recipe) {
    this.navigationService.push(RecipeListNavigationPath.Recipe, {
      queryParams: { id: recipe.id },
      dismissCallback: (params?: unknown) => {
        const typedParams = params as { needToRefresh?: boolean } | undefined;
        if (typedParams?.needToRefresh) {
          return this.getData();
        }
        return Promise.resolve();
      },
    });
  }

  async onAddClicked() {
    this.navigationService.push(RecipeListNavigationPath.AddRecipe, {
      dismissCallback: (params?: unknown) => {
        const typedParams = params as { needToRefresh?: boolean } | undefined;
        if (typedParams?.needToRefresh) {
          return this.getData();
        }
        return Promise.resolve();
      },
    });
  }

  async onAddToPlanningClicked(recipe: Recipe) {
    if (!recipe) return;

    const week = dayjs().add(1, 'week').startOf('week').format('YYYY-MM-DD');
    const group = await this.dataService.retrieveGroup();
    const res = await this.dataService.addToPlanning(recipe, week, undefined, undefined, group);
    if (res) {
      this.navigationService.setRoot([NavigationPath.Base, HomeNavigationPath.Planning], {
        params: { week },
        queryParams: { week },
      });
    } else {
      this.alertService.presentAlertPopup(
        'COMMON.GENERIC_ALERT.ERROR_HEADER',
        'COMMON.PLANNINGS.NO_GROUP_ERROR',
        () => {
          this.navigationService.setRoot([
            NavigationPath.Base,
            HomeNavigationPath.Settings,
            SettingsNavigationPath.PlanningDetail,
          ]);
        },
        'COMMON.PLANNINGS.GO_TO_GROUP_MANAGEMENT_BUTTON',
      );
    }
  }
}
