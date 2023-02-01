import { RecipeTypeEnum } from "./recipe-type.model";

export class Recipe {
    name: string = "NA";
    type: RecipeTypeEnum = RecipeTypeEnum.Other;
}