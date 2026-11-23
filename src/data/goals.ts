import { supabase } from '@/lib/supabase';
import type { UserGoals } from '@/types/database';

/** Fetch the current user's goals. */
export async function getGoals(): Promise<UserGoals | null> {
  try {
    const { data, error } = await supabase
      .from('user_goals')
      .select('*')
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      return null;
    }
    return data as UserGoals;
  } catch {
    return null;
  }
}

/** Upsert user goals. */
export async function upsertGoals(goals: Partial<UserGoals>): Promise<UserGoals | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_goals')
      .upsert({ ...goals, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data as UserGoals;
  } catch (err) {
    console.warn('Upsert goals error:', err);
    return null;
  }
}
