import { Difficulty } from "./difficulty.enum";
import { Ingredient } from "./ingredient.model";
import { Quantity } from "./quantity.model";
import { RecipeType } from "./recipe-type.enum";
import { Step } from "./step.model";

export class Recipe {
    id!: string;
    name!: string;
    description!: string;
    type?: RecipeType;
    time: Quantity = new Quantity();
    difficulty?: Difficulty;
    ingredients: Ingredient[] = [];
    steps: Step[] = [];
    tags: string[] = [];
}