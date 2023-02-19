import { Recipe } from "./recipe.model";
import { WeekDay } from "./weekDay.enum";

export class Planning {
    startDate: string = "";
    recipes: PlannedRecipe[] = [];
}

export class PlannedRecipe {
    id?: string;
    recipe?: Recipe;
    day?: WeekDay;
}
