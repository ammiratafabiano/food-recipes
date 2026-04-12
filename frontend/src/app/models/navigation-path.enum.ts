export enum NavigationPath {
  Base = '',
  Login = 'login',
  Home = '', // kept for backward compat, but no longer used in route paths
  Recipe = 'recipe',
  User = 'user',
  NotFound = 'not-found',
  ItemSelection = 'item-selection',
}

export enum LoginNavigationPath {
  Base = '',
}

export enum HomeNavigationPath {
  Base = '',
  Discover = 'discover',
  RecipeList = 'recipe-list',
  Planning = 'planning',
  ShoppingList = 'shopping-list',
  Settings = 'settings',
}

export enum RecipeListNavigationPath {
  Base = '',
  Recipe = 'recipe',
  AddRecipe = 'add-recipe',
}

export enum RecipeNavigationPath {
  Base = '',
}

export enum UserNavigationPath {
  Base = '',
  Recipe = 'recipe',
}

export enum AddRecipeNavigationPath {
  Base = '',
  ItemSelection = 'item-selection',
}

export enum PlanningNavigationPath {
  Base = '',
  GroupManagement = 'group-management',
}

export enum SettingsNavigationPath {
  Base = '',
  DeleteUser = 'delete-user',
  PlanningDetail = 'planning-detail',
  SocialDetail = 'social-detail',
  NutritionProfile = 'nutrition-profile',
}
