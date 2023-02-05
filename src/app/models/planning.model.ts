import { Recipe } from "./recipe.model";
import { WeekDay } from "./weekDay.enum";

export class Planning {
    startDate: string = "NA";
    recipes: PlannedRecipe[] = [];
}

export class PlannedRecipe {
    recipe?: Recipe;
    day?: WeekDay;
}
