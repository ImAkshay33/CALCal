/**
 * Pure function to calculate recipe nutrition per serving and for the total pot.
 * Matches CALCal Phase 3 rules:
 * - Macro values scaled from per 100g edible portion: (nutrient * grams / 100)
 * - Micronutrients: only keys present in ingredient.micros are aggregated (missing key = not measured, never invent 0)
 * - Rounding: Energy rounded to whole number, macros to 1 decimal place, micros to 2 decimal places.
 */

export interface RecipeIngredientItem {
  id: string;
  name: string;
  grams: number;
  energy_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g?: number | null;
  sugar_g?: number | null;
  micros?: Record<string, number>;
}

export interface CalculatedRecipeNutrition {
  servings: number;
  cookedYieldGrams: number;
  totalPot: {
    energy_kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    micros: Record<string, number>;
  };
  perServing: {
    energy_kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    serving_grams: number;
    micros: Record<string, number>;
  };
}

export function calculateRecipeNutrition(
  ingredients: RecipeIngredientItem[],
  servings = 1,
  cookedYieldGrams?: number
): CalculatedRecipeNutrition {
  const safeServings = Math.max(1, servings);

  let rawTotalGrams = 0;
  let potKcal = 0;
  let potP = 0;
  let potC = 0;
  let potF = 0;
  let potFib = 0;
  let potSug = 0;
  const potMicros: Record<string, number> = {};

  for (const ing of ingredients) {
    if (ing.grams <= 0) continue;
    rawTotalGrams += ing.grams;
    const factor = ing.grams / 100;

    potKcal += (ing.energy_kcal ?? 0) * factor;
    potP += (ing.protein_g ?? 0) * factor;
    potC += (ing.carbs_g ?? 0) * factor;
    potF += (ing.fat_g ?? 0) * factor;
    potFib += (ing.fiber_g ?? 0) * factor;
    potSug += (ing.sugar_g ?? 0) * factor;

    if (ing.micros && typeof ing.micros === 'object') {
      for (const [key, value] of Object.entries(ing.micros)) {
        if (typeof value === 'number' && !isNaN(value)) {
          potMicros[key] = (potMicros[key] || 0) + value * factor;
        }
      }
    }
  }

  const resolvedYield = cookedYieldGrams && cookedYieldGrams > 0 ? cookedYieldGrams : rawTotalGrams;
  const servingGrams = Math.round((resolvedYield / safeServings) * 10) / 10;

  const perServingMicros: Record<string, number> = {};
  for (const [k, v] of Object.entries(potMicros)) {
    perServingMicros[k] = Math.round((v / safeServings) * 100) / 100;
  }

  return {
    servings: safeServings,
    cookedYieldGrams: resolvedYield,
    totalPot: {
      energy_kcal: Math.round(potKcal),
      protein_g: Math.round(potP * 10) / 10,
      carbs_g: Math.round(potC * 10) / 10,
      fat_g: Math.round(potF * 10) / 10,
      fiber_g: Math.round(potFib * 10) / 10,
      sugar_g: Math.round(potSug * 10) / 10,
      micros: Object.fromEntries(
        Object.entries(potMicros).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
    },
    perServing: {
      energy_kcal: Math.round(potKcal / safeServings),
      protein_g: Math.round((potP / safeServings) * 10) / 10,
      carbs_g: Math.round((potC / safeServings) * 10) / 10,
      fat_g: Math.round((potF / safeServings) * 10) / 10,
      fiber_g: Math.round((potFib / safeServings) * 10) / 10,
      sugar_g: Math.round((potSug / safeServings) * 10) / 10,
      serving_grams: servingGrams,
      micros: perServingMicros,
    },
  };
}
