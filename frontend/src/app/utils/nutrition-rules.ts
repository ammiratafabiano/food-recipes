/**
 * ── Nutrition Rules ──────────────────────────────────────────────────────────
 *
 * This file centralises every nutritional calculation used by the application.
 * It is meant to be reviewed by qualified nutritionists or other AI systems.
 *
 * Current formulas:
 *   • BMR  → Mifflin-St Jeor equation
 *   • TDEE → BMR × activity multiplier
 *   • Macro split → 30 % protein, 25 % fat, 45 % carbs (by kcal)
 *   • Fiber → fixed 25 g/day regardless of TDEE
 *
 * Feel free to suggest changes or alternative approaches.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { RecommendedDaily } from '../models/nutrition-summary.model';

// ── Activity multipliers (Harris-Benedict style) ────────────────────────────

export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// ── Macro distribution (percentage of total kcal) ───────────────────────────

export const MACRO_RATIOS = {
  protein: 0.3, // 30 % of kcal
  fat: 0.25, // 25 % of kcal
  carbs: 0.45, // 45 % of kcal
};

// ── Calories per gram ───────────────────────────────────────────────────────

const KCAL_PER_GRAM = {
  protein: 4,
  fat: 9,
  carbs: 4,
};

// ── Fixed targets ───────────────────────────────────────────────────────────

const FIBER_DAILY_GRAMS = 25;

// ── Public API ──────────────────────────────────────────────────────────────

export interface NutritionProfile {
  weight: number; // kg
  height: number; // cm
  age: number; // years
  sex: 'male' | 'female';
  activity_level: string; // key in ACTIVITY_MULTIPLIERS
}

/**
 * Mifflin-St Jeor Basal Metabolic Rate.
 *
 *   Male:   10 × weight(kg) + 6.25 × height(cm) − 5 × age(y) + 5
 *   Female: 10 × weight(kg) + 6.25 × height(cm) − 5 × age(y) − 161
 */
export function calculateBMR(profile: NutritionProfile): number {
  const base = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
  return profile.sex === 'male' ? base + 5 : base - 161;
}

/**
 * Total Daily Energy Expenditure = BMR × activity multiplier.
 */
export function calculateTDEE(profile: NutritionProfile): number {
  const bmr = calculateBMR(profile);
  const multiplier =
    ACTIVITY_MULTIPLIERS[profile.activity_level] ?? ACTIVITY_MULTIPLIERS['sedentary'];
  return Math.round(bmr * multiplier);
}

/**
 * Recommended daily macro-nutrient targets (in grams) based on TDEE.
 */
export function calculateRecommendedDaily(profile: NutritionProfile): RecommendedDaily {
  const tdee = calculateTDEE(profile);
  return {
    kcal: tdee,
    protein: Math.round((tdee * MACRO_RATIOS.protein) / KCAL_PER_GRAM.protein),
    fat: Math.round((tdee * MACRO_RATIOS.fat) / KCAL_PER_GRAM.fat),
    carbs: Math.round((tdee * MACRO_RATIOS.carbs) / KCAL_PER_GRAM.carbs),
    fiber: FIBER_DAILY_GRAMS,
  };
}
