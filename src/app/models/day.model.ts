import { Recipe } from './recipe.model';

export interface Day {
  name: string;
  recipes: Recipe[];
}
