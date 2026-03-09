export interface DayNutrition {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

export interface RecommendedDaily {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

export const DEFAULT_RECOMMENDED_DAILY: RecommendedDaily = {
  kcal: 2000,
  protein: 50,
  fat: 65,
  carbs: 300,
  fiber: 25,
};

export interface NutritionSummary {
  week: string;
  days: Record<string, DayNutrition>;
  weekTotal: DayNutrition;
  missingNutritionFoods?: string[];
}
