import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionSheetController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
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

@Component({
  selector: 'app-recipe',
  templateUrl: './recipe.page.html',
  styleUrls: ['./recipe.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(DataService);
  private readonly loadingService = inject(LoadingService);
  private readonly alertService = inject(AlertService);
  private readonly translateService = inject(TranslateService);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly navigationService = inject(NavigationService);
  private readonly authService = inject(AuthService);

  readonly id = input<string>();

  readonly recipe = signal<Recipe | undefined>(undefined);

  readonly trackByIngredient = trackById;
  readonly trackByStep = trackByIndex;

  readonly multiplier = signal<number>(1);
  readonly currentMultiplier = signal<number>(1);

  readonly isUserLogged = computed(() => !!this.authService.currentUser());
  readonly isMine = computed(
    () => this.authService.getCurrentUser()?.id == this.recipe()?.userId,
  );

  refreshOnDismiss = false;

  ngOnInit() {
    const recipeId = this.id();
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
      this.navigationService.setRoot([
        NavigationPath.Base,
        NavigationPath.NotFound,
      ]);
    }
  }

  async onBackClicked() {
    this.navigationService.goToPreviousPage({
      needToRefresh: this.refreshOnDismiss,
    });
  }

  async onEditClicked() {
    this.navigationService.setRoot(
      [
        NavigationPath.Base,
        NavigationPath.Home,
        HomeNavigationPath.RecipeList,
        RecipeListNavigationPath.AddRecipe,
      ],
      {
        params: {
          recipe: this.recipe(),
        },
      },
    );
  }

  async onShareClicked() {
    const currentRecipe = this.recipe();
    if (!currentRecipe) return;
    const link = environment.siteUrl + '?recipe=' + currentRecipe.id;
    navigator.clipboard.writeText(link);
    const text = this.translateService.instant('COMMON.CLIPBOARD');
    this.alertService.presentInfoPopup(text);
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
    this.navigationService.setRoot(
      [NavigationPath.Base, NavigationPath.Recipe],
      {
        queryParams: {
          id: this.recipe()?.variantId,
        },
      },
    );
  }

  async onSelfClicked() {
    this.navigationService.setRoot([
      NavigationPath.Base,
      NavigationPath.Home,
      HomeNavigationPath.Settings,
    ]);
  }

  async onMultiplierChange(
    event: CustomEvent<{ value?: string | number | null }>,
  ) {
    const currentRecipe = this.recipe();
    if (!currentRecipe) return;
    const value = event.detail?.value;
    const newCurrentMultiplier = value ? Number(value) : currentRecipe.servings;
    this.currentMultiplier.set(newCurrentMultiplier);
    this.multiplier.set(
      newCurrentMultiplier ? newCurrentMultiplier / currentRecipe.servings : 1,
    );
  }

  async onMultiplierBlur(
    event: CustomEvent<{ value?: string | number | null }>,
  ) {
    const value = event.detail?.value;
    const currentRecipe = this.recipe();
    if (!value && currentRecipe)
      this.currentMultiplier.set(currentRecipe.servings);
  }

  async onAddToPlanningClicked() {
    const currentRecipe = this.recipe();
    if (!currentRecipe) return;

    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translateService.instant(
        'COMMON.PLANNINGS.ADD_TO_PLANNING.CHOICE',
      ),
      buttons: [
        {
          text: this.translateService.instant(
            'COMMON.PLANNINGS.ADD_TO_PLANNING.THIS_WEEK',
          ),
          data: {
            action: dayjs().startOf('week').format('YYYY-MM-DD'),
          },
        },
        {
          text: this.translateService.instant(
            'COMMON.PLANNINGS.ADD_TO_PLANNING.NEXT_WEEK',
          ),
          data: {
            action: dayjs().startOf('week').add(1, 'week').format('YYYY-MM-DD'),
          },
        },
        {
          text: this.translateService.instant(
            'COMMON.PLANNINGS.ADD_TO_PLANNING.CANCEL',
          ),
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
    const result = await actionSheet.onDidDismiss();
    if (result?.data?.action) {
      const res = await this.dataService.addToPlanning(
        currentRecipe,
        result.data.action,
      );
      if (res) {
        this.navigationService.setRoot(
          [
            NavigationPath.Base,
            NavigationPath.Home,
            HomeNavigationPath.Planning,
          ],
          {
            queryParams: {
              week: result?.data?.action,
            },
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
  }

  async onDeleteClicked() {
    return this.alertService.presentConfirmPopup(
      'RECIPE_PAGE.DELETE_POPUP_CONFIRM_MESSAGE',
      () => {
        const currentRecipe = this.recipe();
        currentRecipe && this.dataService.deleteRecipe(currentRecipe);
        this.navigationService.pop({ needToRefresh: true });
      },
    );
  }
}
