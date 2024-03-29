import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionSheetController, LoadingController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Cuisine } from 'src/app/models/cuisine.enum';
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
import { SessionService } from 'src/app/services/session.service';

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
    private readonly translateService: TranslateService,
    private readonly sessionService: SessionService,
    private readonly actionSheetCtrl: ActionSheetController
  ) { }

  ngOnInit() {
    const recipeToEdit = this.navigationService.getParams<{recipe:Recipe}>()?.recipe;
    if (recipeToEdit) {
      this.isEdit = true;
      this.selectedRecipe = recipeToEdit;
    }
    this.getData();
  }

  private async getData() {
    this.foodList = this.sessionService.foodList;
    if (!this.foodList) {
      const loading = await this.loadingController.create()
      await loading.present()
      this.dataService.getFoodList().then(response => {
        this.foodList = response;
        if (this.foodList) this.sessionService.foodList = this.foodList;
      }).finally(() => loading.dismiss());
    }
  }

  async onBackClicked() {
    return this.navigationService.pop();
  }

  async onVariantChange(event: any) {
    this.selectedRecipe.variantId = event.target.checked ? this.selectedRecipe.id : undefined;
    this.selectedRecipe.variantName = event.target.checked ? this.selectedRecipe.name : undefined;
  }

  async onAddCuisineClicked() {
    this.navigationService.push(AddRecipeNavigationPath.ItemSelection,
      {
        params: {
          items: Object.values(Cuisine).map(x => { return {
            text: this.translateService.instant("COMMON.CUISINE_TYPES." + x),
            value: x
          }})
        },
        dismissCallback: (item: Item) => {
          if (item) {
            this.selectedRecipe.cuisine = item.value;
          }
        }
      }
    );
  }

  async onAddIngredientClicked(index?: number) {
    const loading = await this.loadingController.create()
    await loading.present()
    this.navigationService.push(AddRecipeNavigationPath.ItemSelection,
      {
        params: {
          items: this.foodList?.map(x => { return {value: x.id, text: x.name} })
        },
        presentCallback: () => {
          loading.dismiss();
        },
        dismissCallback: async (item: Item) => {
          const food = await this.mapSelectedIngredient(item);
          if (index != undefined) {
            food && this.selectedRecipe.ingredients.splice(index, 1, food);
          } else {
            food && this.selectedRecipe.ingredients.push(food);
          }
        }
      }
    );
  }

  private async mapSelectedIngredient(item?: Item): Promise<Ingredient | undefined> {
    let food: Ingredient | undefined;
    if (item?.custom) {
      food = await this.addCustomFood(item.text);
    } else if (item) {
      food = new Ingredient();
      food.id = item.value;
      food.name = item.text;
    }
    return food;
  }

  private async addCustomFood(name: string) {
    const loading = await this.loadingController.create()
    await loading.present()
    return this.dataService.addCustomFood(name).finally(() => loading.dismiss());
  }

  async onIngredientUnitClicked(selectedIngredient: Ingredient) {  
    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translateService.instant("ADD_RECIPE_PAGE.UNIT_PLACEHOLDER"),
      buttons: [
        ...this.weightUnitList.map(x => {
          return {
            text: this.translateService.instant("COMMON.WEIGHT_UNITS." + x),
            data: {
              action: x
            }
          }
        }),
        {
          text: this.translateService.instant("ADD_RECIPE_PAGE.UNIT_RESET"),
          data: {
            action: undefined
          },
          role: 'cancel'
        }
      ],
    });
    await actionSheet.present();
    const result = await actionSheet.onDidDismiss();
    if (result?.data) {
      selectedIngredient.quantity.unit = result.data.action;
    }
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
    return this.navigationService.setRoot([NavigationPath.Base, NavigationPath.Home, HomeNavigationPath.RecipeList, RecipeListNavigationPath.Recipe], {
      queryParams: {
        id: this.selectedRecipe.id
      }
    });
  }
}
