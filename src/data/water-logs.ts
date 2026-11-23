import { supabase } from '@/lib/supabase';

export interface WaterLog {
  id: string;
  user_id: string;
  log_date: string;
  ml: number;
}

/** Fetch water log for a date */
export async function getWaterLog(date: string): Promise<number> {
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {}

  if (userId) {
    try {
      const { data, error } = await supabase
        .from('water_logs')
        .select('ml')
        .eq('user_id', userId)
        .eq('log_date', date)
        .maybeSingle();
      if (!error && data && data.ml !== null) return Number(data.ml);
    } catch {}

    const raw = localStorage.getItem(`calcal_user_${userId}_water_${date}`);
    if (raw) return parseInt(raw, 10);
  }

  // Fallback for legacy key
  const legacy = localStorage.getItem(`calcal_water_${date}`);
  return legacy ? parseInt(legacy, 10) : 0;
}

/** Update water log for a date */
export async function updateWaterLog(date: string, ml: number): Promise<number> {
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {}

  if (userId) {
    localStorage.setItem(`calcal_user_${userId}_water_${date}`, String(ml));
    try {
      await supabase
        .from('water_logs')
        .upsert(
          { user_id: userId, log_date: date, ml },
          { onConflict: 'user_id,log_date' }
        );
    } catch (err) {
      console.warn('Update water log error:', err);
    }
  }

  localStorage.setItem(`calcal_water_${date}`, String(ml));
  return ml;
}
