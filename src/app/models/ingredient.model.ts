import { Food } from "./food.model";
import { Quantity } from "./quantity.model";

export class Ingredient extends Food {
    quantity: Quantity = new Quantity;
}
