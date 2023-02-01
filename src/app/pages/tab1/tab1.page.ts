import { Component } from '@angular/core';
import { RecipeType, RecipeTypeEnum } from 'src/app/models/recipe-type.model';
import { Recipe } from 'src/app/models/recipe.model';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  recipes: Recipe[];
  displayRecipes: Recipe[];
  recipeTypes: RecipeType[] = [];

  constructor() {
    this.recipes = [
      {
        name: "Red Velvet",
        type: RecipeTypeEnum.Dessert
      },
      {
        name: "Canestrelli",
        type: RecipeTypeEnum.Dessert
      },
      {
        name: "Cinnamon Roll",
        type: RecipeTypeEnum.Dessert
      },
      {
        name: "Pistacchiosa",
        type: RecipeTypeEnum.FirstCourse
      },
      {
        name: "Pollo al curry",
        type: RecipeTypeEnum.SecondCourse
      },
      {
        name: "Rosticceria",
        type: RecipeTypeEnum.YeastProducts
      },
      {
        name: "Grissini sfiziosi",
        type: RecipeTypeEnum.Appetizer
      }
    ]
    this.recipes.sort((a, b) => a.name.localeCompare(b.name))
    this.displayRecipes = this.recipes;
    this.recipeTypes = []
    Object.values(RecipeTypeEnum).forEach(x => {
      if (this.recipes.find(y => y.type == x)) {
        let recipeType = new RecipeType();
        recipeType.type = x;
        this.recipeTypes.push(recipeType);
      }
    });
  }

  onTypeClicked(recipeType: RecipeType) {
    recipeType.enabled = !recipeType.enabled;
  }
  
  onSearchChange(event: any) {
    const query = event.target.value.toLowerCase().trim();
    this.displayRecipes = this.recipes.filter(x => x.name.toLowerCase().indexOf(query) > -1);
  }

}
