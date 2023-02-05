import { RecipeTypeEnum } from "./recipe-type.enum";

export class RecipeTypeFilter {
    type: RecipeTypeEnum = RecipeTypeEnum.Other;
    enabled = true; 
}
