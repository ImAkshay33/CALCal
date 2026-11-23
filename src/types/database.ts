// Database types matching the Supabase schema

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type EntryType = 'food' | 'user_food' | 'quick_add';
export type DietType = 'veg' | 'egg' | 'nonveg';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'lose' | 'maintain' | 'gain';
export type SexType = 'female' | 'male' | 'other';

/** Micronutrient map: keys are unit-suffixed (e.g. "iron_mg"), values are numbers. Missing key = not measured. */
export type MicrosMap = Record<string, number>;

export interface Food {
  id: string;
  source: string;
  source_code: string;
  name: string;
  scientific_name: string | null;
  food_group: string | null;
  diet: DietType | null;
  is_dish: boolean;
  energy_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  micros: MicrosMap;
  local_names: Record<string, string[]>;
  search_text: string;
  verified: boolean;
  notes: string | null;
  created_at: string;
}

export interface FoodServing {
  id: string;
  food_id: string;
  label: string;
  grams: number;
  is_default: boolean;
}

export interface UserFood {
  id: string;
  user_id: string;
  name: string;
  serving_label: string;
  serving_g: number | null;
  energy_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  micros: MicrosMap;
  recipe: RecipeData | null;
  created_at: string;
}

export interface RecipeData {
  ingredients: {
    food_id: string;
    grams: number;
    id?: string;
    name?: string;
    energy_kcal?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    fiber_g?: number | null;
    micros?: MicrosMap;
  }[];
  pieces: number;
  yield_g: number;
}

export interface FoodLog {
  id: string;
  user_id: string;
  logged_at: string;
  log_date: string; // 'YYYY-MM-DD'
  meal: MealType | null;
  entry_type: EntryType;
  food_id: string | null;
  user_food_id: string | null;
  label: string;
  quantity: number | null;
  serving_label: string | null;
  grams: number | null;
  energy_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  micros: MicrosMap;
}

export interface UserGoals {
  user_id: string;
  energy_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  micro_targets: MicrosMap;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  sex: SexType | null;
  birth_year: number | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: ActivityLevel | null;
  goal: GoalType | null;
  created_at: string;
}

export interface DailySummaryRow {
  log_date: string;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  entries: number;
}

export interface Favorite {
  id: string;
  user_id: string;
  food_id: string | null;
  user_food_id: string | null;
}

export interface WeightLog {
  id: string;
  user_id: string;
  log_date: string;
  weight_kg: number;
}

export interface WaterLog {
  id: string;
  user_id: string;
  log_date: string;
  ml: number;
}
