import { Component } from '@angular/core';
import { ActionSheetController, LoadingController, ModalController, NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { RecipeTagFilter } from 'src/app/models/recipe-tag-filter.model';
import { RecipeTypeFilter } from 'src/app/models/recipe-type-filter.model';
import { RecipeType } from 'src/app/models/recipe-type.enum';
import { Recipe } from 'src/app/models/recipe.model';
import { DataService } from 'src/app/services/data.service';
import { AddRecipePage } from '../add-recipe/add-recipe.page';

@Component({
  selector: 'app-recipe-list',
  templateUrl: 'recipe-list.page.html',
  styleUrls: ['recipe-list.page.scss']
})
export class RecipeListPage {

  recipes?: Recipe[];
  displayRecipes?: Recipe[];

  // Filters
  recipeTypeFilters: RecipeTypeFilter[] = [];
  recipeTagFilters: RecipeTagFilter[] = [];

  constructor(
    private readonly navCtrl: NavController,
    private readonly dataService: DataService,
    private readonly modalController: ModalController,
    private readonly loadingController: LoadingController,
    private readonly translateService: TranslateService,
    private readonly actionSheetCtrl: ActionSheetController
  ) {
    this.getData();
  }

  private async getData() {
    const loading = await this.loadingController.create();
    await loading.present();
    this.dataService.getRecipeList().then(response => {
      if (response && response.length > 0) {
        this.recipes = response;
        this.displayRecipes = this.recipes;
      }
    }).finally(async () => {
      await loading.dismiss();
      this.initFilters();
    });
  }

  private initFilters() {
    // Init types
    this.recipeTypeFilters = [];
    Object.values(RecipeType).forEach(x => {
      if (this.recipes?.find(y => y.type == x)) {
        let recipeTypeFilter = new RecipeTypeFilter();
        recipeTypeFilter.type = x;
        this.recipeTypeFilters.push(recipeTypeFilter);
      }
    });
    // Init tags
    this.recipeTagFilters = [];
    this.recipes?.forEach(x => {
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
  }

  onRecipeClicked(recipe: Recipe) {
    this.navCtrl.navigateForward("recipe", {queryParams: { id: recipe.id } });
  }

  async onAddClicked() {
    const modal = await this.modalController.create({
      component: AddRecipePage,
      componentProps: {
        isEdit: true
      }
    });
    modal.onDidDismiss().then((params) => params?.data?.needToUpdate && this.getData());
    await modal.present();
  }

  async onAddToPlanningClicked(recipe: Recipe) {
    if (!recipe) return;
  
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
      await this.dataService.addToPlanning(recipe, result.data.action);
      this.navCtrl.navigateRoot("tabs/planning", {
        queryParams: {
          week: result?.data?.action
        }
      });
    }
  }

}
