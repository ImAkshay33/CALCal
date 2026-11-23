import { supabase } from '@/lib/supabase';

export interface WaterLog {
  id: string;
  user_id: string;
  log_date: string;
  ml: number;
}

/** Fetch water log for a date */
export async function getWaterLog(date: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('water_logs')
      .select('ml')
      .eq('log_date', date)
      .maybeSingle();
    if (!error && data) return data.ml;
  } catch {}
  // Local storage fallback
  const raw = localStorage.getItem(`calcal_water_${date}`);
  return raw ? parseInt(raw, 10) : 0;
}

/** Update water log for a date */
export async function updateWaterLog(date: string, ml: number): Promise<number> {
  localStorage.setItem(`calcal_water_${date}`, String(ml));
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase
        .from('water_logs')
        .upsert({ user_id: userData.user.id, log_date: date, ml });
    }
  } catch {}
  return ml;
}
