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
  IonBackButton,
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
  RecipeListNavigationPath,
  SettingsNavigationPath,
} from 'src/app/models/navigation-path.enum';
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
    IonBackButton,
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

  readonly isUserLogged = computed(() => !!this.authService.currentUser());
  readonly isMine = computed(() => this.authService.getCurrentUser()?.id == this.recipe()?.userId);

  refreshOnDismiss = false;

  ngOnInit() {
    const recipeId = this.route.snapshot.queryParamMap.get('id');
    if (recipeId) {
      this.getRecipe(recipeId);
    } else {
      this.navigationService.setRoot([
        NavigationPath.Base,
        NavigationPath.Home,
        HomeNavigationPath.RecipeList,
      ]);
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
    this.navigationService.setRoot([
      NavigationPath.Base,
      NavigationPath.Home,
      HomeNavigationPath.Settings,
    ]);
  }

  async onIncreaseServings() {
    const currentRecipe = this.recipe();
    if (!currentRecipe) return;
    const splitServings = currentRecipe.splitServings || 1;
    const newCurrentMultiplier = this.currentMultiplier() + splitServings;
    this.currentMultiplier.set(newCurrentMultiplier);
    this.multiplier.set(newCurrentMultiplier / currentRecipe.servings);
  }

  async onDecreaseServings() {
    const currentRecipe = this.recipe();
    if (!currentRecipe) return;
    const splitServings = currentRecipe.splitServings || 1;
    const minServings = currentRecipe.minServings || 1;
    const newCurrentMultiplier = Math.max(minServings, this.currentMultiplier() - splitServings);
    this.currentMultiplier.set(newCurrentMultiplier);
    this.multiplier.set(newCurrentMultiplier / currentRecipe.servings);
  }

  async onAddToPlanningClicked() {
    const currentRecipe = this.recipe();
    if (!currentRecipe) return;

    const week = dayjs().add(1, 'week').startOf('week').format('YYYY-MM-DD');
    const recipeToAdd = { ...currentRecipe, servings: this.currentMultiplier() };
    const group = await this.dataService.retrieveGroup();
    const res = await this.dataService.addToPlanning(
      recipeToAdd,
      week,
      undefined,
      undefined,
      group,
    );
    if (res) {
      this.navigationService.setRoot(
        [NavigationPath.Base, NavigationPath.Home, HomeNavigationPath.Planning],
        {
          params: { week },
          queryParams: { week },
        },
      );
    } else {
      this.alertService.presentAlertPopup(
        'COMMON.GENERIC_ALERT.ERROR_HEADER',
        'COMMON.PLANNINGS.NO_GROUP_ERROR',
        () => {
          this.navigationService.setRoot([
            NavigationPath.Base,
            NavigationPath.Home,
            HomeNavigationPath.Settings,
            SettingsNavigationPath.GroupManagement,
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
