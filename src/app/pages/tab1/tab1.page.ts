import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { RecipeTagFilter } from 'src/app/models/recipe-tag-filter.model';
import { RecipeTypeFilter } from 'src/app/models/recipe-type-filter.model';
import { RecipeTypeEnum } from 'src/app/models/recipe-type.enum';
import { Recipe } from 'src/app/models/recipe.model';
import { DataService } from 'src/app/services/data.service';

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
    private readonly dataService: DataService
  ) {
    this.getData();
    this.initFilters();
  }

  private getData() {
    this.recipes = this.dataService.getRecipes();
    this.displayRecipes = this.recipes;
  }

  private initFilters() {
    // Init types
    Object.values(RecipeTypeEnum).forEach(x => {
      if (this.recipes.find(y => y.type == x)) {
        let recipeTypeFilter = new RecipeTypeFilter();
        recipeTypeFilter.type = x;
        this.recipeTypeFilters.push(recipeTypeFilter);
      }
    });
    // Init tags
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
    this.navCtrl.navigateForward('recipe', {queryParams: { recipe: JSON.stringify(recipe) } });
  }

  async onAddToPlanningClicked(recipe: Recipe) {
    await this.dataService.addToPlanning(recipe);
    this.navCtrl.navigateRoot('tabs/tab3', {queryParams: { recipe: JSON.stringify(recipe) } });
  }

}
