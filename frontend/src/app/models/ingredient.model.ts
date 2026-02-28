import { Food } from './food.model';
import { Quantity } from './quantity.model';

export interface Ingredient extends Food {
  quantity: Quantity;
  brand?: string;
}
