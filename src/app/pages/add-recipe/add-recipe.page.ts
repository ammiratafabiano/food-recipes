import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { Difficulty } from 'src/app/models/difficulty.enum';
import { Food } from 'src/app/models/food.model';
import { AddRecipeNavigationPath } from 'src/app/models/navigation-path.enum';
import { RecipeType } from 'src/app/models/recipe-type.enum';
import { Recipe } from 'src/app/models/recipe.model';
import { Step } from 'src/app/models/step.model';
import { TimeUnit, WeightUnit } from 'src/app/models/unit.enum';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-add-recipe',
  templateUrl: './add-recipe.page.html',
  styleUrls: ['./add-recipe.page.scss'],
})
export class AddRecipePage implements OnInit {

  typeList: RecipeType[] = Object.values(RecipeType);
  difficultyList: Difficulty[] = Object.values(Difficulty);
  weightUnitList: WeightUnit[] = Object.values(WeightUnit);
  timeUnitList: TimeUnit[] = Object.values(TimeUnit);
  foodList?: Food[];

  selectedRecipe: Recipe = new Recipe();

  isEdit = false;

  constructor(
    private readonly dataService: DataService,
    private readonly loadingController: LoadingController,
    private readonly navigationService: NavigationService
  ) { }

  ngOnInit() {
    this.getData();
  }

  private async getData() {
    const loading = await this.loadingController.create()
    await loading.present()
    this.dataService.getFoodList().then(response => {
      this.foodList = response;
    }).finally(() => loading.dismiss());
  }

  async onBackClicked() {
    return this.navigationService.pop();
  }

  async onAddIngredientClicked() {
    this.navigationService.push(AddRecipeNavigationPath.IngredientSelection,
      {
        params: {
          foodList: this.foodList
        },
        dismissCallback: (ingredient: any) => {
          if (ingredient && !this.selectedRecipe.ingredients.find(x => x.id == ingredient.id)) {
            this.selectedRecipe.ingredients.push(ingredient);
          }
        }
      }
    );
  }

  onAddStepClicked() {
    const last = this.selectedRecipe.steps.length > 0 && this.selectedRecipe.steps[this.selectedRecipe.steps.length - 1]
    if (!last || (last?.imageUrl || last?.text)) {
      this.selectedRecipe.steps.push(new Step());
    }
  }

  onRemoveIngredientClicked(index: number) {
    this.selectedRecipe.ingredients.splice(index, 1);
  }

  onRemoveStepClicked(index: number) {
    this.selectedRecipe.steps.splice(index, 1);
  }

  onStepImageChange(event: any, step: Step) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      step.imageUrl = reader.result?.toString();
    };
  }

  async onConfirmClicked() {
    const loading = await this.loadingController.create()
    await loading.present()
    this.dataService.addRecipe(this.selectedRecipe).then(
      () => { // Success
        this.navigationService.pop({ needToRefresh: true });
      },
      () => { // Error
        this.navigationService.pop();
      }
    ).finally(() => loading.dismiss());
  }
}
