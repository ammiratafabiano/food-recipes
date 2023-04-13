export enum NavigationPath {
    Base = "",
    Login = "login",
    Home = "home",
    Recipe = "recipe",
    User = "user",
    NotFound = "not-found"
}

export enum LoginNavigationPath {
    Base = "",
    Register = "register"
}

export enum HomeNavigationPath {
    Base = "",
    Discover = "discover",
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

export enum RecipeNavigationPath {
    Base = ""
}

export enum UserNavigationPath {
    Base = "",
    Recipe = "recipe"
}

export enum AddRecipeNavigationPath {
    Base = "",
    IngredientSelection = "ingredient-selection",
    ItemSelection = "item-selection"
}

export enum SettingsNavigationPath {
    Base = "",
    DeleteUser = "delete-user"
}
