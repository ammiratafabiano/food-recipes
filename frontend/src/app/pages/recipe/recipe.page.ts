import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DecimalPipe } from '@angular/common';
import dayjs from 'dayjs';
import {
  HomeNavigationPath,
  NavigationPath,
  SettingsNavigationPath,
  RecipeListNavigationPath,
} from 'src/app/models/navigation-path.enum';
import { Ingredient } from 'src/app/models/ingredient.model';
import { Recipe } from 'src/app/models/recipe.model';
import { AlertService } from 'src/app/services/alert.service';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { LoadingService } from 'src/app/services/loading.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { environment } from 'src/environments/environment';
import { trackById, trackByIndex } from 'src/app/utils/track-by';
import { shareOrCopy } from 'src/app/utils/clipboard';

@Component({
  selector: 'app-recipe',
  templateUrl: './recipe.page.html',
  styleUrls: ['./recipe.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    TranslateModule,
    DecimalPipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonButtons,
    IonButton,
    IonIcon,
    IonLabel,
    IonItem,
    IonList,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonChip,
    IonInput,
    IonNote,
  ],
})
export class RecipePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(DataService);
  private readonly loadingService = inject(LoadingService);
  private readonly alertService = inject(AlertService);
  private readonly translateService = inject(TranslateService);
  private readonly navigationService = inject(NavigationService);
  private readonly authService = inject(AuthService);

  readonly recipe = signal<Recipe | undefined>(undefined);

  readonly trackByIngredient = trackById;
  readonly trackByStep = trackByIndex;

  readonly multiplier = signal<number>(1);
  readonly currentMultiplier = signal<number>(1);

  /** When true, ingredient quantities become editable inputs */
  readonly editMode = signal<boolean>(false);

  /**
   * Stores overridden ingredient values (index → new quantity).
   * Only populated when the user edits in editMode.
   */
  readonly ingredientOverrides = signal<Record<number, number>>({});

  readonly isUserLogged = computed(() => !!this.authService.currentUser());
  readonly isMine = computed(() => this.authService.getCurrentUser()?.id == this.recipe()?.userId);

  refreshOnDismiss = false;

  ngOnInit() {
    const recipeId = this.route.snapshot.queryParamMap.get('id');
    if (recipeId) {
      this.getRecipe(recipeId);
    } else {
      this.navigationService.setRoot([NavigationPath.Base, HomeNavigationPath.RecipeList]);
    }
  }

  private async getRecipe(id: string) {
    await this.loadingService.withLoader(async () => {
      const resp = await this.dataService.getRecipe(id);
      this.recipe.set(resp);
      this.currentMultiplier.set(resp?.servings || 1);
    });
    const currentRecipe = this.recipe();
    if (!currentRecipe) {
      this.navigationService.setRoot([NavigationPath.Base, NavigationPath.NotFound]);
    }
  }

  async onBackClicked() {
    // If navigated from a user page (userId in query params) and the nav stack
    // is empty (e.g. after a page refresh), navigate back to the user page
    // with the correct user id instead of falling back to root.
    const userId = this.route.snapshot.queryParamMap.get('userId');
    if (userId && !this.navigationService.hasStack) {
      const currentUrl = this.navigationService.currentUrl;
      // Go up one segment (e.g. /discover/user/recipe → /discover/user)
      const parentSegments = currentUrl.split('/').filter(Boolean);
      parentSegments.pop();
      this.navigationService.setRoot(parentSegments, {
        queryParams: { id: userId },
        animationDirection: 'back',
      });
      return;
    }
    this.navigationService.goToPreviousPage({
      needToRefresh: this.refreshOnDismiss,
    });
  }

  async onEditClicked() {
    this.navigationService.push('../' + RecipeListNavigationPath.AddRecipe, {
      params: {
        recipe: this.recipe(),
      },
      dismissCallback: (params?: unknown) => {
        const typedParams = params as { needToRefresh?: boolean } | undefined;
        if (typedParams?.needToRefresh) {
          this.refreshOnDismiss = true;
          const recipeId = this.recipe()?.id;
          if (recipeId) this.getRecipe(recipeId);
        }
        return Promise.resolve();
      },
    });
  }

  async onShareClicked() {
    const currentRecipe = this.recipe();
    if (!currentRecipe) return;
    const link = environment.siteUrl + '?recipe=' + currentRecipe.id;
    const result = await shareOrCopy(link, currentRecipe.name);
    if (result === 'copied') {
      const text = this.translateService.instant('COMMON.CLIPBOARD');
      this.alertService.presentInfoPopup(text);
    }
  }

  async onSaveClicked() {
    const currentRecipe = this.recipe();
    if (!currentRecipe) return;
    await this.loadingService.withLoader(async () => {
      const result = await this.dataService.saveRecipe(currentRecipe.id);
      if (result) {
        this.recipe.set({ ...currentRecipe, isAdded: true });
        this.refreshOnDismiss = true;
      }
    });
  }

  async onUnsaveClicked() {
    const currentRecipe = this.recipe();
    if (!currentRecipe) return;
    await this.loadingService.withLoader(async () => {
      const result = await this.dataService.unsaveRecipe(currentRecipe.id);
      if (result) {
        this.recipe.set({ ...currentRecipe, isAdded: false });
        this.refreshOnDismiss = true;
      }
    });
  }

  async onOwnerClicked() {
    this.navigationService.setRoot([NavigationPath.Base, NavigationPath.User], {
      queryParams: {
        id: this.recipe()?.userId,
      },
    });
  }

  async onVariantClicked() {
    this.navigationService.setRoot([NavigationPath.Base, NavigationPath.Recipe], {
      queryParams: {
        id: this.recipe()?.variantId,
      },
    });
  }

  async onSelfClicked() {
    this.navigationService.setRoot([NavigationPath.Base, HomeNavigationPath.Settings]);
  }

  async onIncreaseServings() {
    const currentRecipe = this.recipe();
    if (!currentRecipe) return;
    const splitServings = currentRecipe.splitServings || 1;
    const newCurrentMultiplier = this.currentMultiplier() + splitServings;
    this.currentMultiplier.set(newCurrentMultiplier);
    this.multiplier.set(newCurrentMultiplier / currentRecipe.servings);
    // Reset overrides when changing servings via +/-
    this.ingredientOverrides.set({});
  }

  async onDecreaseServings() {
    const currentRecipe = this.recipe();
    if (!currentRecipe) return;
    const splitServings = currentRecipe.splitServings || 1;
    const minServings = currentRecipe.minServings || 1;
    const newCurrentMultiplier = Math.max(minServings, this.currentMultiplier() - splitServings);
    this.currentMultiplier.set(newCurrentMultiplier);
    this.multiplier.set(newCurrentMultiplier / currentRecipe.servings);
    // Reset overrides when changing servings via +/-
    this.ingredientOverrides.set({});
  }

  onToggleEditMode() {
    const wasInEditMode = this.editMode();
    this.editMode.set(!wasInEditMode);
    if (wasInEditMode) {
      // Exiting edit mode: reset overrides
      this.ingredientOverrides.set({});
    }
  }

  /**
   * Called when user changes an ingredient value in edit mode.
   * Recalculates the multiplier based on the ratio of new value to original.
   */
  onIngredientOverride(index: number, rawValue: string | number) {
    const newValue = typeof rawValue === 'string' ? parseFloat(rawValue) : rawValue;
    if (isNaN(newValue) || newValue <= 0) return;

    const currentRecipe = this.recipe();
    if (!currentRecipe) return;

    const ingredient = currentRecipe.ingredients[index];
    if (!ingredient || !ingredient.quantity.value) return;

    const originalValue = ingredient.quantity.value;
    const newMultiplier = newValue / originalValue;

    // Update the overrides map
    const overrides = { ...this.ingredientOverrides() };
    overrides[index] = newValue;
    this.ingredientOverrides.set(overrides);

    // Update multiplier and currentMultiplier proportionally
    this.multiplier.set(newMultiplier);
    this.currentMultiplier.set(Math.round(newMultiplier * currentRecipe.servings * 10) / 10);
  }

  /**
   * Returns the display value for an ingredient, considering overrides.
   */
  getIngredientDisplayValue(index: number, ingredient: Ingredient): number | undefined {
    const overrides = this.ingredientOverrides();
    if (overrides[index] !== undefined) {
      return overrides[index];
    }
    if (!ingredient.quantity.value) return undefined;
    return ingredient.quantity.value * this.multiplier();
  }

  async onAddToPlanningClicked() {
    const currentRecipe = this.recipe();
    if (!currentRecipe) return;

    // When overrides are active, snap to the closest lower valid servings
    let servings = this.currentMultiplier();
    if (Object.keys(this.ingredientOverrides()).length > 0) {
      const splitServings = currentRecipe.splitServings || 1;
      const minServings = currentRecipe.minServings || 1;
      servings = Math.max(
        minServings,
        Math.floor((servings - minServings) / splitServings) * splitServings + minServings,
      );
    }

    const week = dayjs().add(1, 'week').startOf('week').format('YYYY-MM-DD');
    const res = await this.dataService.addToPlanning(
      currentRecipe,
      week,
      undefined,
      undefined,
      undefined,
      servings,
    );
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

  async onDeleteClicked() {
    return this.alertService.presentConfirmPopup('RECIPE_PAGE.DELETE_POPUP_CONFIRM_MESSAGE', () => {
      const currentRecipe = this.recipe();
      currentRecipe && this.dataService.deleteRecipe(currentRecipe);
      this.navigationService.pop({ needToRefresh: true });
    });
  }
}
