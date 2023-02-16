import { TimetUnit, WeightUnit } from "./unit.enum";

export class Quantity {
    value!: number;
    unit?: WeightUnit | TimetUnit;
}
