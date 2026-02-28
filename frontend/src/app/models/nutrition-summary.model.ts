export interface DayNutrition {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

export interface NutritionSummary {
  week: string;
  days: Record<string, DayNutrition>;
  weekTotal: DayNutrition;
}
