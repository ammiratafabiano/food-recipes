import { RecipeType } from './recipe-type.enum';

export interface RecipeTypeFilter {
  type: RecipeType;
  enabled: boolean;
}
