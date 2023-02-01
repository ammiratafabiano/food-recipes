export class RecipeType {
    type: RecipeTypeEnum = RecipeTypeEnum.Other;
    enabled = true; 
}

export enum RecipeTypeEnum {
    Appetizer = "APPETIZER",
    FirstCourse = "FIRSTCOURSE",
    SecondCourse = "SECONDCOURSE",
    Sides = "SIDES",
    YeastProducts = "YEASTPRODUCTS",
    Dessert = "DESSERT",
    Beverage = "BEVERAGE",
    Other = "OTHER"
}