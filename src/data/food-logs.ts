import { supabase } from '@/lib/supabase';
import type { FoodLog, Food, UserFood, FoodServing, MealType } from '@/types/database';

const LOCAL_STORAGE_PREFIX = 'calcal_logs_';

function getLocalLogs(date: string): FoodLog[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${date}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalLog(log: FoodLog) {
  try {
    const existing = getLocalLogs(log.log_date);
    const updated = [log, ...existing.filter((l) => l.id !== log.id)];
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${log.log_date}`, JSON.stringify(updated));
  } catch {}
}

function removeLocalLog(id: string) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LOCAL_STORAGE_PREFIX)) {
        const logs: FoodLog[] = JSON.parse(localStorage.getItem(key) || '[]');
        const filtered = logs.filter((l) => l.id !== id);
        if (filtered.length !== logs.length) {
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    }
  } catch {}
}

/** Fetch all food log entries for a given date (user's local date). */
export async function getFoodLogs(date: string): Promise<FoodLog[]> {
  try {
    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .eq('log_date', date)
      .order('logged_at', { ascending: true });

    if (error) {
      console.warn('Supabase food_logs query error:', error.message);
      return getLocalLogs(date);
    }

    const logs = (data ?? []) as FoodLog[];
    // Merge any locally logged items that might not have synced yet
    const local = getLocalLogs(date);
    const idSet = new Set(logs.map((l) => l.id));
    const merged = [...logs];
    for (const loc of local) {
      if (!idSet.has(loc.id)) {
        merged.push(loc);
      }
    }

    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${date}`, JSON.stringify(merged));
    } catch {}

    return merged;
  } catch (err) {
    console.warn('Network/Supabase error, using local storage cache:', err);
    return getLocalLogs(date);
  }
}

/** Delete a food log entry by ID. */
export async function deleteFoodLog(id: string): Promise<void> {
  removeLocalLog(id);
  try {
    await supabase.from('food_logs').delete().eq('id', id);
  } catch (err) {
    console.warn('Delete in Supabase failed, removed locally:', err);
  }
}

/** Search global foods using database search_foods RPC or fallback */
export async function searchFoods(q: string, lim = 25): Promise<Food[]> {
  if (!q.trim()) return [];
  try {
    const { data, error } = await supabase.rpc('search_foods', { q: q.trim(), lim });
    if (!error && data && data.length > 0) return data as Food[];
  } catch {}

  try {
    const { data: fallback, error: fbError } = await supabase
      .from('foods')
      .select('*')
      .or(`name.ilike.%${q.trim()}%,search_text.ilike.%${q.trim()}%`)
      .limit(lim);
    if (!fbError && fallback && fallback.length > 0) return fallback as Food[];
  } catch {}

  return [];
}

/** Fetch food servings for a food */
export async function getFoodServings(foodId: string): Promise<FoodServing[]> {
  try {
    const { data, error } = await supabase
      .from('food_servings')
      .select('*')
      .eq('food_id', foodId);
    if (!error && data) return data as FoodServing[];
  } catch {}
  return [];
}

/** Log a food */
export async function logFood(
  foodId: string,
  qty: number,
  servingId: string | null = null,
  meal: MealType = 'lunch',
  date: string,
  foodFallback?: Partial<Food>
): Promise<FoodLog> {
  const localSnapshotId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const servingDesc = servingId ? '1 serving' : `${qty} g`;

  const fallbackLog: FoodLog = {
    id: localSnapshotId,
    user_id: 'current_user',
    logged_at: new Date().toISOString(),
    log_date: date,
    meal,
    entry_type: 'food',
    food_id: foodId,
    user_food_id: null,
    label: foodFallback?.name || 'Food item',
    quantity: qty,
    serving_label: servingDesc,
    grams: servingId ? qty * 150 : qty,
    energy_kcal: Math.round(((foodFallback?.energy_kcal ?? 139) * (servingId ? qty * 1.5 : qty / 100))),
    protein_g: Math.round(((foodFallback?.protein_g ?? 3.5) * (servingId ? qty * 1.5 : qty / 100)) * 10) / 10,
    carbs_g: Math.round(((foodFallback?.carbs_g ?? 24.2) * (servingId ? qty * 1.5 : qty / 100)) * 10) / 10,
    fat_g: Math.round(((foodFallback?.fat_g ?? 3.2) * (servingId ? qty * 1.5 : qty / 100)) * 10) / 10,
    fiber_g: Math.round(((foodFallback?.fiber_g ?? 1.4) * (servingId ? qty * 1.5 : qty / 100)) * 10) / 10,
    sugar_g: 0,
    micros: foodFallback?.micros || {},
  };

  saveLocalLog(fallbackLog);

  try {
    const { data, error } = await supabase.rpc('log_food', {
      p_food_id: foodId,
      p_qty: qty,
      p_serving_id: servingId,
      p_meal: meal,
      p_date: date,
    });
    if (!error && data) {
      saveLocalLog(data as FoodLog);
      return data as FoodLog;
    }
  } catch {}

  return fallbackLog;
}

/** Log a user's custom food or dish */
export async function logUserFood(
  userFoodId: string,
  qty: number,
  meal: MealType = 'lunch',
  date: string,
  userFoodFallback?: Partial<UserFood>
): Promise<FoodLog> {
  const localSnapshotId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const fallbackLog: FoodLog = {
    id: localSnapshotId,
    user_id: 'current_user',
    logged_at: new Date().toISOString(),
    log_date: date,
    meal,
    entry_type: 'user_food',
    food_id: null,
    user_food_id: userFoodId,
    label: userFoodFallback?.name || 'Custom dish',
    quantity: qty,
    serving_label: userFoodFallback?.serving_label || 'serving',
    grams: qty * (userFoodFallback?.serving_g || 200),
    energy_kcal: Math.round((userFoodFallback?.energy_kcal ?? 285) * qty),
    protein_g: Math.round(((userFoodFallback?.protein_g ?? 13) * qty) * 10) / 10,
    carbs_g: Math.round(((userFoodFallback?.carbs_g ?? 9) * qty) * 10) / 10,
    fat_g: Math.round(((userFoodFallback?.fat_g ?? 21) * qty) * 10) / 10,
    fiber_g: Math.round(((userFoodFallback?.fiber_g ?? 4) * qty) * 10) / 10,
    sugar_g: 0,
    micros: userFoodFallback?.micros || {},
  };

  saveLocalLog(fallbackLog);

  try {
    const { data, error } = await supabase.rpc('log_user_food', {
      p_user_food_id: userFoodId,
      p_qty: qty,
      p_meal: meal,
      p_date: date,
    });
    if (!error && data) {
      saveLocalLog(data as FoodLog);
      return data as FoodLog;
    }
  } catch {}

  return fallbackLog;
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
  const localSnapshotId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const localLog: FoodLog = {
    id: localSnapshotId,
    user_id: 'current_user',
    logged_at: new Date().toISOString(),
    log_date: params.date,
    meal: params.meal,
    entry_type: 'quick_add',
    food_id: null,
    user_food_id: null,
    label: params.label || 'Eyeballed food',
    quantity: 1,
    serving_label: 'custom',
    grams: null,
    energy_kcal: params.energy_kcal,
    protein_g: params.protein_g,
    carbs_g: params.carbs_g,
    fat_g: params.fat_g,
    fiber_g: params.micros?.fiber_g || 0,
    sugar_g: 0,
    micros: params.micros || {},
  };

  saveLocalLog(localLog);

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
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
      if (!error && data) {
        saveLocalLog(data as FoodLog);
        return data as FoodLog;
      }
    }
  } catch {}

  return localLog;
}

/** Fetch user custom foods */
export async function getUserFoods(): Promise<UserFood[]> {
  try {
    const { data, error } = await supabase
      .from('user_foods')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) return data as UserFood[];
  } catch {}
  return [];
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
  const fallbackUserFood: UserFood = {
    id: `uf_${Date.now()}`,
    user_id: 'current_user',
    name: food.name,
    serving_label: food.serving_label,
    serving_g: food.serving_g,
    energy_kcal: food.energy_kcal,
    protein_g: food.protein_g,
    carbs_g: food.carbs_g,
    fat_g: food.fat_g,
    fiber_g: food.fiber_g || 0,
    sugar_g: 0,
    micros: food.micros || {},
    recipe: food.recipe || null,
    created_at: new Date().toISOString(),
  };

  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
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
      if (!error && data) return data as UserFood;
    }
  } catch {}

  return fallbackUserFood;
}

/** Fetch Recent logged foods for the current user */
export async function getRecentFoods(limit = 15): Promise<FoodLog[]> {
  try {
    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .order('logged_at', { ascending: false })
      .limit(limit);
    if (!error && data) {
      const seen = new Set<string>();
      const unique: FoodLog[] = [];
      for (const log of data) {
        if (!seen.has(log.label.toLowerCase())) {
          seen.add(log.label.toLowerCase());
          unique.push(log);
        }
      }
      return unique;
    }
  } catch {}
  return [];
}

/** Fetch Frequent logged foods for current user */
export async function getFrequentFoods(limit = 15): Promise<{ label: string; count: number; log: FoodLog }[]> {
  try {
    const { data, error } = await supabase.from('food_logs').select('*');
    if (!error && data && data.length > 0) {
      const counts: Record<string, { label: string; count: number; log: FoodLog }> = {};
      for (const log of data) {
        const key = log.label.toLowerCase();
        if (!counts[key]) counts[key] = { label: log.label, count: 0, log };
        counts[key].count += 1;
      }
      return Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    }
  } catch {}
  return [];
}

/** Favorites */
export async function getFavorites(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('favorites').select('food_id, user_food_id');
    if (!error && data) {
      return data.map((f) => f.food_id || f.user_food_id).filter(Boolean) as string[];
    }
  } catch {}
  return [];
}

export async function toggleFavorite(foodId?: string, userFoodId?: string): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .match(foodId ? { food_id: foodId } : { user_food_id: userFoodId });

    if (existing && existing.length > 0) {
      await supabase.from('favorites').delete().eq('id', existing[0].id);
      return false;
    } else {
      await supabase.from('favorites').insert(foodId ? { food_id: foodId } : { user_food_id: userFoodId });
      return true;
    }
  } catch {
    return true;
  }
}

/** Progress: Daily Summary */
export async function getDailySummary(from: string, to: string) {
  try {
    const { data, error } = await supabase.rpc('daily_summary', { p_from: from, p_to: to });
    if (!error && data) return data;
  } catch {}
  return [];
}

/** Progress: Micro by day */
export async function getMicroByDay(from: string, to: string) {
  try {
    const { data, error } = await supabase.rpc('micro_by_day', { p_from: from, p_to: to });
    if (!error && data) return data;
  } catch {}
  return [];
}

/** Weight Logs */
export async function getWeightLogs() {
  try {
    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .order('log_date', { ascending: true });
    if (!error && data) return data;
  } catch {}
  return [];
}

export async function addWeightLog(weight_kg: number, log_date: string) {
  try {
    const { data, error } = await supabase
      .from('weight_logs')
      .upsert({ weight_kg, log_date })
      .select()
      .single();
    if (!error && data) return data;
  } catch {}
  return { weight_kg, log_date };
}

/** Get all food logs across all dates (for CSV export and data history) */
export async function getAllFoodLogs(): Promise<FoodLog[]> {
  const localMap = new Map<string, FoodLog>();

  // 1. Collect from localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LOCAL_STORAGE_PREFIX)) {
        const logs: FoodLog[] = JSON.parse(localStorage.getItem(key) || '[]');
        logs.forEach((l) => localMap.set(l.id, l));
      }
    }
  } catch {}

  // 2. Fetch from Supabase
  try {
    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .order('log_date', { ascending: false })
      .order('logged_at', { ascending: false });
    if (!error && data) {
      (data as FoodLog[]).forEach((l) => localMap.set(l.id, l));
    }
  } catch {}

  return Array.from(localMap.values()).sort(
    (a, b) => (b.log_date || '').localeCompare(a.log_date || '') || (b.logged_at || '').localeCompare(a.logged_at || '')
  );
}

/** Wipe all user data (logs, water, weight, custom foods, favorites, local storage) */
export async function clearAllUserData(): Promise<void> {
  // Clear localStorage
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('calcal_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}

  // Delete from Supabase
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('food_logs').delete().eq('user_id', user.id);
      await supabase.from('user_foods').delete().eq('user_id', user.id);
      await supabase.from('water_logs').delete().eq('user_id', user.id);
      await supabase.from('weight_logs').delete().eq('user_id', user.id);
      await supabase.from('favorites').delete().eq('user_id', user.id);
    }
  } catch (err) {
    console.warn('Wipe Supabase data error:', err);
  }
}
