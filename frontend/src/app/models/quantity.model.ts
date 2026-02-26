import { TimeUnit, WeightUnit } from './unit.enum';

export interface Quantity {
  value?: number;
  unit?: WeightUnit | TimeUnit;
}
