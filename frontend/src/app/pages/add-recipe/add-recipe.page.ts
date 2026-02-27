import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActionSheetController } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Cuisine } from 'src/app/models/cuisine.enum';
import { Difficulty } from 'src/app/models/difficulty.enum';
import { Ingredient } from 'src/app/models/ingredient.model';
import { Item } from 'src/app/models/item.model';
import {
  AddRecipeNavigationPath,
  HomeNavigationPath,
  NavigationPath,
  RecipeListNavigationPath,
} from 'src/app/models/navigation-path.enum';
import { RecipeType } from 'src/app/models/recipe-type.enum';
import { Recipe } from 'src/app/models/recipe.model';
import { Step } from 'src/app/models/step.model';
import { TimeUnit, WeightUnit } from 'src/app/models/unit.enum';
import { DataService } from 'src/app/services/data.service';
import { LoadingService } from 'src/app/services/loading.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { SessionService } from 'src/app/services/session.service';
import { createIngredient, createRecipe, createStep } from 'src/app/utils/model-factories';
import { trackById, trackByIndex } from 'src/app/utils/track-by';

@Component({
  selector: 'app-add-recipe',
  templateUrl: './add-recipe.page.html',
  styleUrls: ['./add-recipe.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonButtons,
    IonButton,
    IonIcon,
    IonLabel,
    IonItem,
    IonList,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonItemSliding,
    IonItemOption,
    IonItemOptions,
    IonCheckbox,
  ],
})
export class AddRecipePage implements OnInit {
  private readonly dataService = inject(DataService);
  private readonly loadingService = inject(LoadingService);
  private readonly navigationService = inject(NavigationService);
  private readonly translateService = inject(TranslateService);
  private readonly sessionService = inject(SessionService);
  private readonly actionSheetCtrl = inject(ActionSheetController);

  readonly typeList: RecipeType[] = Object.values(RecipeType);
  readonly difficultyList: Difficulty[] = Object.values(Difficulty);
  readonly weightUnitList: WeightUnit[] = Object.values(WeightUnit);
  readonly timeUnitList: TimeUnit[] = Object.values(TimeUnit);
  readonly foodList = signal<Ingredient[] | undefined>(undefined);

  readonly selectedRecipe = signal<Recipe>(createRecipe());

  readonly isEdit = signal<boolean>(false);
  stepsOfImagesToDelete: Step[] = [];

  readonly trackByIngredient = trackById;
  readonly trackByStep = trackByIndex;
  readonly trackByOption = (_: number, option: string | number) => option;

  constructor() {}

  ngOnInit() {
    const recipeToEdit = this.navigationService.getParams<{ recipe: Recipe }>()?.recipe;
    if (recipeToEdit) {
      this.isEdit.set(true);
      this.selectedRecipe.set(recipeToEdit);
    }
    this.getData();
  }

  private async getData() {
    const foodList = this.sessionService.foodList();
    if (!foodList) {
      await this.loadingService.withLoader(async () => {
        const food = await this.dataService.getFoodList();
        if (food) this.sessionService.setFoodList(food);
        this.foodList.set(food);
      });
    } else {
      this.foodList.set(foodList);
      // Fetch in background to update cache
      this.dataService.getFoodList().then((food) => {
        if (food) {
          this.sessionService.setFoodList(food);
          this.foodList.set(food);
        }
      });
    }
  }

  async onBackClicked() {
    return this.navigationService.pop();
  }

  async onVariantChange(event: CustomEvent<{ checked?: boolean }>) {
    const checked = !!event.detail?.checked;
    this.selectedRecipe.update((recipe) => ({
      ...recipe,
      variantId: checked ? recipe.id : undefined,
      variantName: checked ? recipe.name : undefined,
    }));
  }

  async onAddCuisineClicked() {
    this.navigationService.push(AddRecipeNavigationPath.ItemSelection, {
      params: {
        items: Object.values(Cuisine).map((x) => {
          return {
            text: this.translateService.instant('COMMON.CUISINE_TYPES.' + x),
            value: x,
          };
        }),
      },
      dismissCallback: (item: Item) => {
        if (item) {
          this.selectedRecipe.update((recipe) => ({
            ...recipe,
            cuisine: item.value as Cuisine,
          }));
        }
      },
    });
  }

  async onAddIngredientClicked(index?: number) {
    this.navigationService.push(AddRecipeNavigationPath.ItemSelection, {
      params: {
        items: this.foodList()?.map((x) => {
          return { value: x.id, text: x.name };
        }),
      },
      dismissCallback: async (item: Item) => {
        const food = await this.mapSelectedIngredient(item);
        if (food) {
          this.selectedRecipe.update((recipe) => {
            const ingredients = [...recipe.ingredients];
            if (index != undefined) {
              ingredients.splice(index, 1, food);
            } else {
              ingredients.push(food);
            }
            return { ...recipe, ingredients };
          });
        }
      },
    });
  }

  private async mapSelectedIngredient(item?: Item): Promise<Ingredient | undefined> {
    let food: Ingredient | undefined;
    if (item?.custom) {
      food = await this.addCustomFood(item.text);
    } else if (item) {
      food = createIngredient({ id: item.value, name: item.text });
    }
    return food;
  }

  private async addCustomFood(name: string) {
    return this.loadingService.withLoader(() => this.dataService.addCustomFood(name));
  }

  async onIngredientUnitClicked(selectedIngredient: Ingredient) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translateService.instant('ADD_RECIPE_PAGE.UNIT_PLACEHOLDER'),
      buttons: [
        ...this.weightUnitList.map((x) => {
          return {
            text: this.translateService.instant('COMMON.WEIGHT_UNITS.' + x),
            data: {
              action: x,
            },
          };
        }),
        {
          text: this.translateService.instant('COMMON.GENERIC_ALERT.CANCEL_BUTTON'),
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
    const result = await actionSheet.onDidDismiss();
    if (result?.data) {
      selectedIngredient.quantity.unit = result.data.action;
      // Trigger signal update
      this.selectedRecipe.update((recipe) => ({ ...recipe }));
    }
  }

  removeStepImage(step: Step) {
    const copiedStep = Object.assign({}, step);
    if (this.isEdit() && !copiedStep.imageToUpload && copiedStep.imageUrl)
      this.stepsOfImagesToDelete.push(copiedStep);
  }

  onAddStepClicked() {
    this.selectedRecipe.update((recipe) => {
      const steps = [...recipe.steps];
      const last = steps.length > 0 && steps[steps.length - 1];
      if (!last || last?.imageUrl || last?.text) {
        steps.push(createStep());
      }
      return { ...recipe, steps };
    });
  }

  onRemoveIngredientClicked(index: number) {
    this.selectedRecipe.update((recipe) => {
      const ingredients = [...recipe.ingredients];
      ingredients.splice(index, 1);
      return { ...recipe, ingredients };
    });
  }

  onRemoveStepImage(index: number) {
    this.selectedRecipe.update((recipe) => {
      const steps = [...recipe.steps];
      this.removeStepImage(steps[index]);
      steps[index] = {
        ...steps[index],
        imageUrl: undefined,
        imageToUpload: false,
      };
      return { ...recipe, steps };
    });
  }

  onRemoveStepClicked(index: number) {
    this.selectedRecipe.update((recipe) => {
      const steps = [...recipe.steps];
      this.removeStepImage(steps[index]);
      steps.splice(index, 1);
      return { ...recipe, steps };
    });
  }

  onStepImageChange(event: Event, step: Step) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (input) input.value = '';
      this.removeStepImage(step);
      step.imageUrl = reader.result?.toString();
      step.imageToUpload = true;
      // Trigger update
      this.selectedRecipe.update((recipe) => ({ ...recipe }));
    };
  }

  async onConfirmClicked() {
    await this.loadingService.withLoader(async () => {
      try {
        await this.dataService.addRecipe(this.selectedRecipe());
        this.navigationService.pop({ needToRefresh: true });
      } catch {
        this.navigationService.pop();
      }
    });
  }

  async onConfirmEditClicked() {
    await this.loadingService.withLoader(async () => {
      try {
        await this.dataService.editRecipe(this.selectedRecipe(), this.stepsOfImagesToDelete);
        this.navigationService.pop({ needToRefresh: true });
      } catch {
        this.navigationService.pop();
      }
    });
  }

  async onCancelClicked() {
    return this.navigationService.setRoot(
      [
        NavigationPath.Base,
        NavigationPath.Home,
        HomeNavigationPath.RecipeList,
        RecipeListNavigationPath.Recipe,
      ],
      {
        queryParams: {
          id: this.selectedRecipe().id,
        },
      },
    );
  }
}
