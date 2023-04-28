import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionSheetController, LoadingController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { take } from 'rxjs';
import { HomeNavigationPath, NavigationPath, RecipeListNavigationPath } from 'src/app/models/navigation-path.enum';
import { Recipe } from 'src/app/models/recipe.model';
import { AlertService } from 'src/app/services/alert.service';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-recipe',
  templateUrl: './recipe.page.html',
  styleUrls: ['./recipe.page.scss'],
})
export class RecipePage implements OnInit {

  recipe?: Recipe;

  multiplier = 1;
  currentMultiplier = 1;

  isUserLogged = false;
  isMine = false;

  refreshOnDismiss = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly dataService: DataService,
    private readonly loadingController: LoadingController,
    private readonly alertService: AlertService,
    private readonly translateService: TranslateService,
    private readonly actionSheetCtrl: ActionSheetController,
    private readonly navigationService: NavigationService,
    private readonly authService: AuthService
  ) { }

  ngOnInit() {
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      if (!this.recipe && params && params["id"]) {
        const recipe_id = params["id"];
        this.getRecipe(recipe_id);
      } else {
        this.navigationService.setRoot([NavigationPath.Base, NavigationPath.Home, HomeNavigationPath.RecipeList]);
      }
    });
    this.isUserLogged = !!this.authService.getCurrentUser();
  }

  private async getRecipe(id: string) {
    const loading = await this.loadingController.create()
    await loading.present()
    this.recipe = await this.dataService.getRecipe(id);
    this.currentMultiplier = this.recipe?.servings || 1;
    await loading.dismiss();
    if (this.recipe) {
      this.isMine = this.authService.getCurrentUser()?.id == this.recipe.userId;
    } else {
      this.navigationService.setRoot([NavigationPath.Base, NavigationPath.NotFound]);
    }
  }

  async onBackClicked() {
    this.navigationService.goToPreviousPage({ needToRefresh: this.refreshOnDismiss });
  }

  async onEditClicked() {
    this.navigationService.setRoot([NavigationPath.Base, NavigationPath.Home, HomeNavigationPath.RecipeList, RecipeListNavigationPath.AddRecipe], {
      params: {
        recipe: this.recipe
      }
    });
  }

  async onShareClicked() {
    if (!this.recipe) return;
    const link = environment.siteUrl + '/recipe?id=' + this.recipe.id;
    navigator.clipboard.writeText(link);
    const text = this.translateService.instant("COMMON.CLIPBOARD");
    this.alertService.presentInfoPopup(text);
  }

  async onSaveClicked() {
    if (!this.recipe) return;
    const loading = await this.loadingController.create()
    await loading.present()
    const result = await this.dataService.saveRecipe(this.recipe.id);
    if (result) {
      this.recipe.isAdded = true;
      this.refreshOnDismiss = true;
    }
    await loading.dismiss();
  }

  async onUnsaveClicked() {
    if (!this.recipe) return;
    const loading = await this.loadingController.create()
    await loading.present()
    const result = await this.dataService.unsaveRecipe(this.recipe.id);
    if (result) {
      this.recipe.isAdded = false;
      this.refreshOnDismiss = true;
    }
    await loading.dismiss();
  }

  async onOwnerClicked() {
    this.navigationService.setRoot([NavigationPath.Base, NavigationPath.User],
      {
        queryParams: {
          id: this.recipe?.userId
        }
      }
    );
  }

  async onVariantClicked() {
    this.navigationService.setRoot([NavigationPath.Base, NavigationPath.Recipe],
      {
        queryParams: {
          id: this.recipe?.variantId
        }
      }
    );
  }

  async onSelfClicked() {
    this.navigationService.setRoot([NavigationPath.Base, NavigationPath.Home, HomeNavigationPath.Settings]);
  }

  async onMultiplierChange(event: any) {
    if (!this.recipe) return;
    this.currentMultiplier = event.target.value;
    this.multiplier = this.currentMultiplier ? this.currentMultiplier / this.recipe?.servings : 1;
  }

  async onMultiplierBlur(event: any) {
    if (!event.target.value && this.recipe) this.currentMultiplier = this.recipe.servings;
  }

  async onAddToPlanningClicked() {
    if (!this.recipe) return;
  
    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translateService.instant("RECIPE_PAGE.ADD_TO_PLANNING_CHOICE"),
      buttons: [
        {
          text: this.translateService.instant("RECIPE_PAGE.ADD_TO_PLANNING_THIS_WEEK"),
          data: {
            action: moment().startOf('week').format("YYYY-MM-DD"),
          }
        },
        {
          text: this.translateService.instant("RECIPE_PAGE.ADD_TO_PLANNING_NEXT_WEEK"),
          data: {
            action: moment().startOf('week').add(1,'week').format("YYYY-MM-DD"),
          }
        },
        {
          text: this.translateService.instant("RECIPE_PAGE.ADD_TO_PLANNING_CANCEL"),
          role: 'cancel'
        },
      ],
    });

    await actionSheet.present();
    const result = await actionSheet.onDidDismiss();
    if (result?.data?.action) {
      await this.dataService.addToPlanning(this.recipe, result.data.action);
      this.navigationService.setRoot([NavigationPath.Base, NavigationPath.Home, HomeNavigationPath.Planning], {
        params: {
          week: result?.data?.action
        }
      });
    }
  }

  async onDeleteClicked() {
    return this.alertService.presentConfirmPopup(
      "RECIPE_PAGE.DELETE_POPUP_CONFIRM_MESSAGE",
      () => {
        this.recipe && this.dataService.deleteRecipe(this.recipe);
        this.navigationService.pop({ needToRefresh: true });
      }
    );
  }

}
