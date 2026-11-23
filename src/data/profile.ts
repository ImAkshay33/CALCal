import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

/** Fetch the current user's profile. */
export async function getProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Profile;
}

/** Update the current user's profile. */
export async function updateProfile(updates: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', updates.id)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}
