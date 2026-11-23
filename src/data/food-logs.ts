import { supabase } from '@/lib/supabase';
import type { FoodLog, Food, UserFood, FoodServing, MealType } from '@/types/database';

const LOCAL_STORAGE_PREFIX = 'calcal_';

// User-isolated storage prefix helper
async function getStorageKey(date: string): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      return `calcal_user_${user.id}_logs_${date}`;
    }
  } catch {}
  return `calcal_guest_logs_${date}`;
}

async function getLocalLogs(date: string): Promise<FoodLog[]> {
  try {
    const key = await getStorageKey(date);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocalLog(log: FoodLog) {
  try {
    const key = await getStorageKey(log.log_date);
    const raw = localStorage.getItem(key);
    const existing: FoodLog[] = raw ? JSON.parse(raw) : [];
    const updated = [log, ...existing.filter((l) => l.id !== log.id)];
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
}

async function removeLocalLog(id: string) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('calcal_') && key.includes('_logs_')) {
        const logs: FoodLog[] = JSON.parse(localStorage.getItem(key) || '[]');
        const filtered = logs.filter((l) => l.id !== id);
        if (filtered.length !== logs.length) {
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    }
  } catch {}
}

/** Fetch all food log entries for a given date (user's local date, strictly filtered by current user). */
export async function getFoodLogs(date: string): Promise<FoodLog[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.id) {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', date)
        .order('logged_at', { ascending: true });

      if (!error && data) {
        const logs = data as FoodLog[];
        const local = await getLocalLogs(date);
        const idSet = new Set(logs.map((l) => l.id));
        const merged = [...logs];
        for (const loc of local) {
          if (!idSet.has(loc.id) && loc.user_id === user.id) {
            merged.push(loc);
          }
        }
        const key = await getStorageKey(date);
        try {
          localStorage.setItem(key, JSON.stringify(merged));
        } catch {}
        return merged;
      }
    }

    return await getLocalLogs(date);
  } catch (err) {
    console.warn('Network/Supabase error, using local storage cache:', err);
    return await getLocalLogs(date);
  }
}

/** Delete a food log entry by ID. */
export async function deleteFoodLog(id: string): Promise<void> {
  await removeLocalLog(id);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('food_logs').delete().eq('id', id).eq('user_id', user.id);
    } else {
      await supabase.from('food_logs').delete().eq('id', id);
    }
  } catch (err) {
    console.warn('Delete in Supabase failed, removed locally:', err);
  }
}

/** Update an existing food log entry (e.g. quantity, meal, or nutrients snapshot) */
export async function updateFoodLog(
  id: string,
  updates: Partial<FoodLog>
): Promise<FoodLog | null> {
  // 1. Update in local storage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LOCAL_STORAGE_PREFIX)) {
        const logs: FoodLog[] = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = logs.findIndex((l) => l.id === id);
        if (idx !== -1) {
          const updated = { ...logs[idx], ...updates };
          logs[idx] = updated;
          localStorage.setItem(key, JSON.stringify(logs));
          // If the log date changed, re-index under the new date key
          if (updates.log_date && updates.log_date !== logs[idx].log_date) {
            const remaining = logs.filter((l) => l.id !== id);
            localStorage.setItem(key, JSON.stringify(remaining));
            saveLocalLog(updated);
          }
        }
      }
    }
  } catch {}

  // 2. Update in Supabase
  try {
    const { data, error } = await supabase
      .from('food_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) return data as FoodLog;
  } catch (err) {
    console.warn('Update food log error:', err);
  }

  return null;
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
  fiber_g?: number;
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
    fiber_g: params.fiber_g ?? params.micros?.fiber_g ?? 0,
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
          fiber_g: params.fiber_g ?? 0,
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
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {}

  const map = new Map<string, UserFood>();

  // 1. User-isolated local storage mirror
  if (userId) {
    try {
      const cached = localStorage.getItem(`calcal_user_${userId}_user_foods`);
      if (cached) {
        const parsed = JSON.parse(cached);
        for (const item of parsed) {
          map.set(item.id, item);
        }
      }
    } catch {}
  }

  // 2. Fetch from Supabase strictly for this user
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('user_foods')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        for (const row of data) {
          map.set(row.id, row as UserFood);
        }
      }
    } catch {}
  }

  const list = Array.from(map.values()).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  if (userId && list.length > 0) {
    localStorage.setItem(`calcal_user_${userId}_user_foods`, JSON.stringify(list));
  }
  return list;
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
  let userId = 'local_user';
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {}

  const fallbackUserFood: UserFood = {
    id: `uf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    user_id: userId,
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

  let saved = fallbackUserFood;

  if (userId !== 'local_user') {
    try {
      const { data, error } = await supabase
        .from('user_foods')
        .insert({
          user_id: userId,
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
      if (!error && data) {
        saved = data as UserFood;
      }
    } catch (err) {
      console.warn('Create user food error in Supabase:', err);
    }

    // Always mirror to user-specific local storage
    try {
      const cached = localStorage.getItem(`calcal_user_${userId}_user_foods`);
      const list: UserFood[] = cached ? JSON.parse(cached) : [];
      const updated = [saved, ...list.filter((f) => f.id !== saved.id)];
      localStorage.setItem(`calcal_user_${userId}_user_foods`, JSON.stringify(updated));
    } catch {}
  }

  return saved;
}

/** Fetch a single user custom food by its ID */
export async function getUserFoodById(id: string): Promise<UserFood | null> {
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {}

  if (userId) {
    try {
      const cached = localStorage.getItem(`calcal_user_${userId}_user_foods`);
      if (cached) {
        const list: UserFood[] = JSON.parse(cached);
        const found = list.find((f) => f.id === id);
        if (found) return found;
      }
    } catch {}

    try {
      const { data, error } = await supabase
        .from('user_foods')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (!error && data) return data as UserFood;
    } catch {}
  }

  return null;
}

/** Update an existing user custom food / recipe */
export async function updateUserFood(
  id: string,
  updates: Partial<UserFood>
): Promise<UserFood | null> {
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {}

  let updated: UserFood | null = null;

  if (userId) {
    try {
      const { data, error } = await supabase
        .from('user_foods')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (!error && data) updated = data as UserFood;
    } catch (err) {
      console.warn('Update user food error:', err);
    }

    try {
      const cached = localStorage.getItem(`calcal_user_${userId}_user_foods`);
      if (cached) {
        const list: UserFood[] = JSON.parse(cached);
        const next = list.map((f) => (f.id === id ? { ...f, ...updates } : f));
        localStorage.setItem(`calcal_user_${userId}_user_foods`, JSON.stringify(next));
      }
    } catch {}
  }

  return updated;
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
export async function getWeightLogs(): Promise<Array<{ id?: string; user_id?: string; log_date: string; weight_kg: number }>> {
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {}

  const weightsMap = new Map<string, { id?: string; user_id?: string; log_date: string; weight_kg: number }>();

  // 1. Local mirror
  if (userId) {
    try {
      const cached = localStorage.getItem(`calcal_user_${userId}_weights`);
      if (cached) {
        const parsed = JSON.parse(cached);
        for (const item of parsed) {
          weightsMap.set(item.log_date, item);
        }
      }
    } catch {}
  }

  // 2. Fetch from Supabase
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', userId)
        .order('log_date', { ascending: true });

      if (!error && data) {
        for (const row of data) {
          weightsMap.set(row.log_date, {
            id: row.id,
            user_id: row.user_id,
            log_date: row.log_date,
            weight_kg: Number(row.weight_kg),
          });
        }
      }
    } catch {}
  }

  const list = Array.from(weightsMap.values()).sort((a, b) => a.log_date.localeCompare(b.log_date));
  if (userId && list.length > 0) {
    localStorage.setItem(`calcal_user_${userId}_weights`, JSON.stringify(list));
  }
  return list;
}

export async function addWeightLog(weight_kg: number, log_date: string) {
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {}

  if (userId) {
    // 1. Supabase upsert on weight_logs
    try {
      await supabase
        .from('weight_logs')
        .upsert({ user_id: userId, weight_kg, log_date }, { onConflict: 'user_id,log_date' });
    } catch (err) {
      console.warn('Upsert weight_logs error:', err);
    }

    // 2. Sync to profiles
    try {
      await supabase
        .from('profiles')
        .update({ current_weight_kg: weight_kg })
        .eq('id', userId);
    } catch {}

    // 3. Update local weights mirror
    try {
      const cached = localStorage.getItem(`calcal_user_${userId}_weights`);
      const list = cached ? JSON.parse(cached) : [];
      const updated = list.filter((w: any) => w.log_date !== log_date);
      updated.push({ user_id: userId, log_date, weight_kg });
      localStorage.setItem(`calcal_user_${userId}_weights`, JSON.stringify(updated));

      // Also update local profile mirror
      const profRaw = localStorage.getItem(`calcal_user_${userId}_profile`);
      if (profRaw) {
        const prof = JSON.parse(profRaw);
        prof.current_weight_kg = weight_kg;
        localStorage.setItem(`calcal_user_${userId}_profile`, JSON.stringify(prof));
      }
    } catch {}
  }

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
