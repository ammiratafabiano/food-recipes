import { Meal } from "./meal.model";
import { Recipe } from "./recipe.model";
import { WeekDay } from "./weekDay.enum";

export class Planning {
    startDate: string = "";
    recipes: PlannedRecipe[] = [];
}

export class PlannedRecipe {
    id?: string;
    user_id?: string;
    recipe?: Recipe;
    week?: string;
    day?: WeekDay;
    meal?: Meal;
}
