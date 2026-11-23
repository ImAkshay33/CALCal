import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

/** Fetch the current user's profile. */
export async function getProfile(): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      return null;
    }
    return data as Profile;
  } catch {
    return null;
  }
}

/** Update or upsert the current user's profile. */
export async function updateProfile(updates: Partial<Profile>): Promise<Profile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ ...updates, id: user.id })
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  } catch (err) {
    console.warn('Update profile error:', err);
    return null;
  }
}
