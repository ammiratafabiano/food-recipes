import { Difficulty } from './difficulty.enum';
import { Ingredient } from './ingredient.model';
import { Quantity } from './quantity.model';
import { RecipeType } from './recipe-type.enum';
import { Step } from './step.model';

export interface Recipe {
  id: string;
  userId: string;
  userName: string;
  name: string;
  description: string;
  cuisine?: string;
  type?: RecipeType;
  time: Quantity;
  difficulty?: Difficulty;
  ingredients: Ingredient[];
  steps: Step[];
  tags: string[];
  servings: number;
  minServings?: number;
  splitServings?: number;
  variantId?: string;
  variantName?: string;
  isAdded?: boolean;
}
