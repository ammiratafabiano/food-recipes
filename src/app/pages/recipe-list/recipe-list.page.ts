import { Component } from '@angular/core';
import { ActionSheetController, LoadingController, ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { HomeNavigationPath, NavigationPath, RecipeListNavigationPath, SettingsNavigationPath } from 'src/app/models/navigation-path.enum';
import { RecipeTagFilter } from 'src/app/models/recipe-tag-filter.model';
import { RecipeTypeFilter } from 'src/app/models/recipe-type-filter.model';
import { RecipeType } from 'src/app/models/recipe-type.enum';
import { Recipe } from 'src/app/models/recipe.model';
import { AlertService } from 'src/app/services/alert.service';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-recipe-list',
  templateUrl: 'recipe-list.page.html',
  styleUrls: ['recipe-list.page.scss']
})
export class RecipeListPage {

  recipes?: Recipe[];
  displayRecipes?: Recipe[];

  othersRecipes?: Recipe[];
  displayOthersRecipes?: Recipe[];

  // Filters
  recipeTypeFilters: RecipeTypeFilter[] = [];
  recipeTagFilters: RecipeTagFilter[] = [];

  constructor(
    private readonly dataService: DataService,
    private readonly loadingController: LoadingController,
    private readonly translateService: TranslateService,
    private readonly actionSheetCtrl: ActionSheetController,
    private readonly navigationService: NavigationService,
    private readonly alertService: AlertService
  ) {
    this.getData();
  }

  private async getData() {
    const loading = await this.loadingController.create();
    await loading.present();
    this.recipes = await this.dataService.getRecipeList() || [];
    this.displayRecipes = this.recipes;
    this.othersRecipes = await this.dataService.getSavedRecipeList() || [];
    this.displayOthersRecipes = this.othersRecipes;
    this.initFilters();
    await loading.dismiss();
  }

  private initFilters() {
    const allRecipes = (this.recipes || []).concat(this.othersRecipes || []);
    // Init types
    this.recipeTypeFilters = [];
    Object.values(RecipeType).forEach(x => {
      if (allRecipes.find(y => y.type == x)) {
        let recipeTypeFilter = new RecipeTypeFilter();
        recipeTypeFilter.type = x;
        this.recipeTypeFilters.push(recipeTypeFilter);
      }
    });
    // Init tags
    this.recipeTagFilters = [];
    allRecipes.forEach(x => {
      x?.tags?.forEach(y => {
        if (!this.recipeTagFilters.find(z => z.tag == y)) {
          let recipeTagFilter = new RecipeTagFilter();
          recipeTagFilter.tag = y;
          this.recipeTagFilters.push(recipeTagFilter);
        }
      });
    });
  }

  onTypeClicked(recipeType: RecipeTypeFilter) {
    recipeType.enabled = !recipeType.enabled;
  }
  
  onSearchChange(event: any) {
    const query = event.target.value.toLowerCase().trim();
    this.displayRecipes = this.recipes?.filter(x => x.name.toLowerCase().indexOf(query) > -1);
    this.displayOthersRecipes = this.othersRecipes?.filter(x => x.name.toLowerCase().indexOf(query) > -1);
  }

  async onRecipeClicked(recipe: Recipe) {
    this.navigationService.push(RecipeListNavigationPath.Recipe,
      {
        queryParams: { id: recipe.id },
        dismissCallback: (params: any) => params?.needToRefresh && this.getData()
      }
    );
  }

  async onAddClicked() {
    this.navigationService.push(RecipeListNavigationPath.AddRecipe,
      {
        dismissCallback: (params: any) => params?.needToRefresh && this.getData()
      }
    );
  }

  async onAddToPlanningClicked(recipe: Recipe) {
    if (!recipe) return;
  
    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translateService.instant("COMMON.PLANNINGS.ADD_TO_PLANNING.CHOICE"),
      buttons: [
        {
          text: this.translateService.instant("COMMON.PLANNINGS.ADD_TO_PLANNING.THIS_WEEK"),
          data: {
            action: moment().startOf('week').format("YYYY-MM-DD"),
          }
        },
        {
          text: this.translateService.instant("COMMON.PLANNINGS.ADD_TO_PLANNING.NEXT_WEEK"),
          data: {
            action: moment().startOf('week').add(1,'week').format("YYYY-MM-DD"),
          }
        },
        {
          text: this.translateService.instant("COMMON.PLANNINGS.ADD_TO_PLANNING.CANCEL"),
          role: 'cancel'
        },
      ],
    });

    await actionSheet.present();
    const result = await actionSheet.onDidDismiss();
    if (result?.data?.action) {
      const res = await this.dataService.addToPlanning(recipe, result.data.action);
      if (res) {
        this.navigationService.setRoot([NavigationPath.Base, NavigationPath.Home, HomeNavigationPath.Planning],
          {
            queryParams: {
              week: result?.data?.action
            }
          }
        );
      } else {
        this.alertService.presentAlertPopup(
          "COMMON.GENERIC_ALERT.ERROR_HEADER",
          "COMMON.PLANNINGS.NO_GROUP_ERROR",
          () => {
            this.navigationService.setRoot([NavigationPath.Base, NavigationPath.Home, HomeNavigationPath.Settings, SettingsNavigationPath.GroupManagement]);
          },
          "COMMON.PLANNINGS.GO_TO_GROUP_MANAGEMENT_BUTTON"
        );
      }
    }
  }

}
