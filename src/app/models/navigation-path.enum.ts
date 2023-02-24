export enum NavigationPath {
    Base = "",
    Login = "login",
    Home = "home",
    NotFound = "not-found"
}

export enum LoginNavigationPath {
    Register = "register"
}

export enum HomeNavigationPath {
    Base = "",
    RecipeList = "recipe-list",
    Planning = "planning",
    ShoppingList = "shopping-list",
    Settings = "settings"
}

export enum RecipeListNavigationPath {
    Base = "",
    Recipe = "recipe",
    AddRecipe = "add-recipe"
}

export enum AddRecipeNavigationPath {
    Base = "",
    IngredientSelection = "ingredient-selection"
}

export enum SettingsNavigationPath {
    Base = "",
    DeleteUser = "delete-user"
}
