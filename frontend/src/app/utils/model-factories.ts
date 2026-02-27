import { Group } from '../models/group.model';
import { Ingredient } from '../models/ingredient.model';
import { NavigationData } from '../models/navigation-data.model';
import { NavigationStackElement } from '../models/navigation-stack-element.model';
import { Planning } from '../models/planning.model';
import { Quantity } from '../models/quantity.model';
import { RecipeTagFilter } from '../models/recipe-tag-filter.model';
import { RecipeTypeFilter } from '../models/recipe-type-filter.model';
import { RecipeType } from '../models/recipe-type.enum';
import { Recipe } from '../models/recipe.model';
import { Step } from '../models/step.model';
import { UserData, UserStats } from '../models/user-data.model';
import { WeightUnit } from '../models/unit.enum';

export const createQuantity = (overrides: Partial<Quantity> = {}): Quantity => ({
  value: undefined,
  unit: undefined,
  ...overrides,
});

export const createIngredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({
  id: '',
  name: '',
  quantity: createQuantity({ unit: WeightUnit.Gram }),
  ...overrides,
});

export const createStep = (overrides: Partial<Step> = {}): Step => ({
  text: '',
  ...overrides,
});

export const createRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: '',
  userId: '',
  userName: '',
  name: '',
  description: '',
  time: createQuantity(),
  ingredients: [],
  steps: [],
  tags: [],
  servings: 0,
  ...overrides,
});

export const createPlanning = (overrides: Partial<Planning> = {}): Planning => ({
  startDate: '',
  recipes: [],
  ...overrides,
});

export const createGroup = (overrides: Partial<Group> = {}): Group => ({
  id: '',
  users: [],
  ...overrides,
});

export const createUserData = (overrides: Partial<UserData> = {}): UserData => ({
  id: '',
  name: '',
  email: '',
  ...overrides,
});

export const createUserStats = (overrides: Partial<UserStats> = {}): UserStats => ({
  saved: 0,
  followers: 0,
  followed: 0,
  ...overrides,
});

export const createNavigationData = (overrides: Partial<NavigationData> = {}): NavigationData => ({
  ...overrides,
});

export const createNavigationStackElement = (
  overrides: Partial<NavigationStackElement> = {},
): NavigationStackElement => ({
  from: '',
  to: '',
  ...overrides,
});

export const createRecipeTypeFilter = (
  overrides: Partial<RecipeTypeFilter> = {},
): RecipeTypeFilter => ({
  type: RecipeType.Other,
  enabled: true,
  ...overrides,
});

export const createRecipeTagFilter = (
  overrides: Partial<RecipeTagFilter> = {},
): RecipeTagFilter => ({
  tag: undefined,
  enabled: true,
  ...overrides,
});
