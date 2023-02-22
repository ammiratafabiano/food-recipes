import { TimeUnit, WeightUnit } from "./unit.enum";

export class Quantity {
    value?: number;
    unit?: WeightUnit | TimeUnit;
}
