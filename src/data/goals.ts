import { supabase } from '@/lib/supabase';
import type { UserGoals } from '@/types/database';

/** Fetch the current user's goals. */
export async function getGoals(): Promise<UserGoals | null> {
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .single();
  if (error) {
    // PGRST116 = no rows, which shouldn't happen (trigger creates default goals) but handle gracefully
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as UserGoals;
}

/** Upsert user goals. */
export async function upsertGoals(goals: Partial<UserGoals>): Promise<UserGoals> {
  const { data, error } = await supabase
    .from('user_goals')
    .upsert(goals)
    .select()
    .single();
  if (error) throw error;
  return data as UserGoals;
}
