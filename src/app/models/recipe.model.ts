import { Difficulty } from "./difficulty.enum";
import { Ingredient } from "./ingredient.model";
import { Quantity } from "./quantity.model";
import { RecipeTypeEnum } from "./recipe-type.enum";
import { Step } from "./step.model";

export class Recipe {
    name: string = "NA";
    type: RecipeTypeEnum = RecipeTypeEnum.Other;
    time?: Quantity;
    difficulty?: Difficulty;
    ingredients: Ingredient[] = [];
    steps: Step[] = [];
    tags?: string[];
}