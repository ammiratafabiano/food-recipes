export enum NavigationPath {
  Base = '',
  Login = 'login',
  Home = 'home',
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

export enum SettingsNavigationPath {
  Base = '',
  GroupManagement = 'group-management',
  DeleteUser = 'delete-user',
}
