import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';
import { getLocalDate } from '@/lib/utils';

const PROFILE_KEY = (userId: string) => `calcal_user_${userId}_profile`;

/** Fetch the current user's profile. */
export async function getProfile(): Promise<Profile | null> {
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {}

  let profile: Profile | null = null;

  if (userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        profile = data as Profile;
      }
    } catch (err) {
      console.warn('Fetch profile from Supabase error:', err);
    }

    // Also look up latest weight from weight_logs if not set in profile
    try {
      const { data: latestWeightRow } = await supabase
        .from('weight_logs')
        .select('weight_kg')
        .eq('user_id', userId)
        .order('log_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestWeightRow?.weight_kg) {
        if (!profile) {
          profile = {
            id: userId,
            username: 'User',
            display_name: 'User',
            sex: null,
            birth_year: null,
            height_cm: null,
            current_weight_kg: Number(latestWeightRow.weight_kg),
            target_weight_kg: null,
            activity_level: null,
            goal: null,
            created_at: new Date().toISOString(),
          };
        } else if (!profile.current_weight_kg) {
          profile.current_weight_kg = Number(latestWeightRow.weight_kg);
        }
      }
    } catch {}

    // Check local storage fallback/merge
    const cached = localStorage.getItem(PROFILE_KEY(userId));
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        profile = {
          ...parsed,
          ...(profile || {}),
          // prioritize whichever has values
          current_weight_kg: profile?.current_weight_kg ?? parsed.current_weight_kg ?? null,
          target_weight_kg: profile?.target_weight_kg ?? parsed.target_weight_kg ?? null,
          height_cm: profile?.height_cm ?? parsed.height_cm ?? null,
          birth_year: profile?.birth_year ?? parsed.birth_year ?? null,
        };
      } catch {}
    }

    if (profile) {
      localStorage.setItem(PROFILE_KEY(userId), JSON.stringify(profile));
    }
    return profile;
  }

  // Fallback if no user yet (e.g. initial boot)
  return null;
}

/** Update or upsert the current user's profile. */
export async function updateProfile(updates: Partial<Profile>): Promise<Profile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const today = getLocalDate();

    // 1. If weight is being updated, ensure it's logged in weight_logs
    if (updates.current_weight_kg && updates.current_weight_kg > 0) {
      try {
        await supabase
          .from('weight_logs')
          .upsert(
            { user_id: user.id, log_date: today, weight_kg: updates.current_weight_kg },
            { onConflict: 'user_id,log_date' }
          );
      } catch (wErr) {
        console.warn('Upsert weight_logs from profile error:', wErr);
      }
    }

    // 2. Try upserting all profile fields
    let savedProfile: Profile | null = null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ ...updates, id: user.id })
        .select()
        .single();

      if (!error && data) {
        savedProfile = data as Profile;
      }
    } catch {
      // If table doesn't have the new columns yet, strip them and save base columns
      try {
        const { current_weight_kg, target_weight_kg, ...baseUpdates } = updates;
        const { data } = await supabase
          .from('profiles')
          .upsert({ ...baseUpdates, id: user.id })
          .select()
          .single();
        if (data) savedProfile = { ...(data as Profile), current_weight_kg: current_weight_kg ?? null, target_weight_kg: target_weight_kg ?? null };
      } catch {}
    }

    // 3. Persist to local mirror so it is instantly restored on reload
    const existing = localStorage.getItem(PROFILE_KEY(user.id));
    const merged = {
      ...(existing ? JSON.parse(existing) : {}),
      ...(savedProfile || {}),
      ...updates,
      id: user.id,
    };
    localStorage.setItem(PROFILE_KEY(user.id), JSON.stringify(merged));

    return merged as Profile;
  } catch (err) {
    console.warn('Update profile error:', err);
    return null;
  }
}
