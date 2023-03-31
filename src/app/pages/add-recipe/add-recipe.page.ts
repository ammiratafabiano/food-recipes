import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { Difficulty } from 'src/app/models/difficulty.enum';
import { Ingredient } from 'src/app/models/ingredient.model';
import { Item } from 'src/app/models/item.model';
import { AddRecipeNavigationPath, HomeNavigationPath, NavigationPath, RecipeListNavigationPath } from 'src/app/models/navigation-path.enum';
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
  foodList?: Ingredient[];

  selectedRecipe: Recipe = new Recipe();

  isEdit = false;
  stepsOfImagesToDelete: Step[] = [];

  constructor(
    private readonly dataService: DataService,
    private readonly loadingController: LoadingController,
    private readonly navigationService: NavigationService,
    private readonly route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params && params["id"]) {
        const recipe_id = params["id"];
        const recipeToEdit = this.navigationService.getParams<{recipe:Recipe}>()?.recipe;
        if (recipeToEdit && recipeToEdit.id == recipe_id) {
          this.isEdit = true;
          this.selectedRecipe = recipeToEdit;
        } else {
          this.navigationService.pop();
        }
      }
    });
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

  async onAddCuisineClicked() {
    this.navigationService.push(AddRecipeNavigationPath.ItemSelection,
      {
        params: {
          items: [{text: "Italiana", value: "ITALIAN"}] // TODO
        },
        dismissCallback: (item: Item) => {
          if (item) {
            this.selectedRecipe.cuisine = item.value;
          }
        }
      }
    );
  }

  async onAddIngredientClicked() {
    this.navigationService.push(AddRecipeNavigationPath.ItemSelection,
      {
        params: {
          items: this.foodList?.map(x => { return {value: x.id, text: x.name} })
        },
        dismissCallback: (item: Item) => {
          if (item && !this.selectedRecipe.ingredients.find(x => x.id == item.value)) {
            const food = this.foodList?.find(x => x.id == item.value);
            food && this.selectedRecipe.ingredients.push(food);
          }
        }
      }
    );
  }

  removeStepImage(step: Step) {
    const copiedStep = Object.assign({}, step);
    if (this.isEdit && !copiedStep.imageToUpload && copiedStep.imageUrl)
      this.stepsOfImagesToDelete.push(copiedStep);
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

  onRemoveStepImage(index: number) {
    this.removeStepImage(this.selectedRecipe.steps[index]);
    this.selectedRecipe.steps[index].imageUrl = undefined;
    this.selectedRecipe.steps[index].imageToUpload = false;
  }

  onRemoveStepClicked(index: number) {
    this.removeStepImage(this.selectedRecipe.steps[index]);
    this.selectedRecipe.steps.splice(index, 1);
    
  }

  onStepImageChange(event: any, step: Step) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      event.target.value = null;
      this.removeStepImage(step);
      step.imageUrl = reader.result?.toString();
      step.imageToUpload = true;
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

  async onConfirmEditClicked() {
    const loading = await this.loadingController.create()
    await loading.present()
    this.dataService.editRecipe(this.selectedRecipe, this.stepsOfImagesToDelete).then(
      () => { // Success
        this.navigationService.pop({ needToRefresh: true });
      },
      () => { // Error
        this.navigationService.pop();
      }
    ).finally(() => loading.dismiss());
  }

  async onCancelClicked() {
    return this.navigationService.setRoot([NavigationPath.Home, HomeNavigationPath.RecipeList, RecipeListNavigationPath.Recipe], {
      queryParams: {
        id: this.selectedRecipe.id
      }
    });
  }
}
