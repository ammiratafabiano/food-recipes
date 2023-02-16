import { Component } from '@angular/core';
import { LoadingController, ModalController, NavController } from '@ionic/angular';
import { RecipeTagFilter } from 'src/app/models/recipe-tag-filter.model';
import { RecipeTypeFilter } from 'src/app/models/recipe-type-filter.model';
import { RecipeType } from 'src/app/models/recipe-type.enum';
import { Recipe } from 'src/app/models/recipe.model';
import { DataService } from 'src/app/services/data.service';
import { AddRecipePage } from '../add-recipe/add-recipe.page';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  recipes: Recipe[] = [];
  displayRecipes: Recipe[] = [];

  // Filters
  recipeTypeFilters: RecipeTypeFilter[] = [];
  recipeTagFilters: RecipeTagFilter[] = [];

  constructor(
    private readonly navCtrl: NavController,
    private readonly dataService: DataService,
    private readonly modalController: ModalController,
    private readonly loadingController: LoadingController
  ) {
    this.getData();
  }

  private async getData() {
    const loading = await this.loadingController.create()
    await loading.present()
    this.dataService.getRecipeList().then(response => {
      this.recipes = response || [];
      this.displayRecipes = this.recipes;
    }).finally(async () => {
      await loading.dismiss();
      this.initFilters();
    });
  }

  private initFilters() {
    // Init types
    this.recipeTypeFilters = [];
    Object.values(RecipeType).forEach(x => {
      if (this.recipes.find(y => y.type == x)) {
        let recipeTypeFilter = new RecipeTypeFilter();
        recipeTypeFilter.type = x;
        this.recipeTypeFilters.push(recipeTypeFilter);
      }
    });
    // Init tags
    this.recipeTagFilters = [];
    this.recipes.forEach(x => {
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
    this.displayRecipes = this.recipes.filter(x => x.name.toLowerCase().indexOf(query) > -1);
  }

  onRecipeClicked(recipe: Recipe) {
    this.navCtrl.navigateForward('recipe', {queryParams: { id: recipe.id } });
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
    //await this.dataService.addToPlanning(recipe); //TODO
    //this.navCtrl.navigateRoot('tabs/tab3', {queryParams: { recipe: JSON.stringify(recipe) } });
  }

}
