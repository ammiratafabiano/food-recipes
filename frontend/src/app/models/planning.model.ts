import { Meal } from './meal.model';
import { Recipe } from './recipe.model';
import { WeekDay } from './weekDay.enum';

export interface Planning {
  startDate: string;
  recipes: PlanningItem[];
}

export type PlanningItem = PlannedRecipe | PlanningSeparator;

export interface PlanningSeparator {
  kind: 'separator';
  day: WeekDay;
}

export interface PlannedRecipe {
  kind: 'recipe';
  id: string;
  user_id: string;
  recipe_id: string;
  recipe_name: string;
  recipe: Recipe;
  week?: string;
  day?: WeekDay;
  meal?: Meal;
  servings?: number;
  assignedTo?: string;
  minServings?: number;
  splitServings?: number;
}
