import { supabase } from '@/lib/supabase';
import type { FoodLog, Food, UserFood, FoodServing, MealType } from '@/types/database';

/** Fetch all food log entries for a given date (user's local date). */
export async function getFoodLogs(date: string): Promise<FoodLog[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('log_date', date)
    .order('logged_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FoodLog[];
}

/** Delete a food log entry by ID. */
export async function deleteFoodLog(id: string): Promise<void> {
  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/** Search global foods using database search_foods RPC */
export async function searchFoods(q: string, lim = 25): Promise<Food[]> {
  if (!q.trim()) return [];
  const { data, error } = await supabase.rpc('search_foods', { q: q.trim(), lim });
  if (error) {
    // Fallback: direct select if RPC not yet created
    const { data: fallback, error: fbError } = await supabase
      .from('foods')
      .select('*')
      .ilike('name', `%${q.trim()}%`)
      .limit(lim);
    if (fbError) throw fbError;
    return (fallback ?? []) as Food[];
  }
  return (data ?? []) as Food[];
}

/** Log a food using RPC */
export async function logFood(
  foodId: string,
  qty: number,
  servingId: string | null = null,
  meal: MealType = 'lunch',
  date: string
): Promise<FoodLog> {
  const { data, error } = await supabase.rpc('log_food', {
    p_food_id: foodId,
    p_qty: qty,
    p_serving_id: servingId,
    p_meal: meal,
    p_date: date,
  });
  if (error) throw error;
  return data as FoodLog;
}

/** Log a user's custom food or dish */
export async function logUserFood(
  userFoodId: string,
  qty: number,
  meal: MealType = 'lunch',
  date: string
): Promise<FoodLog> {
  const { data, error } = await supabase.rpc('log_user_food', {
    p_user_food_id: userFoodId,
    p_qty: qty,
    p_meal: meal,
    p_date: date,
  });
  if (error) throw error;
  return data as FoodLog;
}

/** Direct quick-add log entry */
export async function quickAddLog(params: {
  label: string;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  micros?: Record<string, number>;
  meal: MealType;
  date: string;
}): Promise<FoodLog> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('food_logs')
    .insert({
      user_id: userData.user.id,
      log_date: params.date,
      meal: params.meal,
      entry_type: 'quick_add',
      label: params.label || 'Eyeballed food',
      energy_kcal: params.energy_kcal,
      protein_g: params.protein_g,
      carbs_g: params.carbs_g,
      fat_g: params.fat_g,
      micros: params.micros || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as FoodLog;
}

/** Fetch user custom foods */
export async function getUserFoods(): Promise<UserFood[]> {
  const { data, error } = await supabase
    .from('user_foods')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserFood[];
}

/** Create user custom food */
export async function createUserFood(food: {
  name: string;
  serving_label: string;
  serving_g: number;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  micros?: Record<string, number>;
  recipe?: any;
}): Promise<UserFood> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_foods')
    .insert({
      user_id: userData.user.id,
      name: food.name,
      serving_label: food.serving_label,
      serving_g: food.serving_g,
      energy_kcal: food.energy_kcal,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      fiber_g: food.fiber_g || 0,
      micros: food.micros || {},
      recipe: food.recipe || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as UserFood;
}

/** Fetch food servings for a food */
export async function getFoodServings(foodId: string): Promise<FoodServing[]> {
  const { data, error } = await supabase
    .from('food_servings')
    .select('*')
    .eq('food_id', foodId);
  if (error) throw error;
  return (data ?? []) as FoodServing[];
}

/** Progress: Daily Summary */
export async function getDailySummary(from: string, to: string) {
  const { data, error } = await supabase.rpc('daily_summary', { p_from: from, p_to: to });
  if (error) return [];
  return data ?? [];
}

/** Progress: Micro by day */
export async function getMicroByDay(from: string, to: string) {
  const { data, error } = await supabase.rpc('micro_by_day', { p_from: from, p_to: to });
  if (error) return [];
  return data ?? [];
}

/** Weight Logs */
export async function getWeightLogs() {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .order('log_date', { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function addWeightLog(weight_kg: number, log_date: string) {
  const { data, error } = await supabase
    .from('weight_logs')
    .upsert({ weight_kg, log_date })
    .select()
    .single();
  if (error) throw error;
  return data;
}
