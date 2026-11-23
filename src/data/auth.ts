import { supabase } from '@/lib/supabase';
import { AUTH_EMAIL_DOMAIN } from '@/lib/constants';
import type { Session, User } from '@supabase/supabase-js';

function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export async function signUp(username: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: {
      data: { username: username.toLowerCase() },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(username: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session) return null;

  // Auto-refresh token if expired or about to expire in under 2 minutes
  const isExpiring = data.session.expires_at
    ? data.session.expires_at * 1000 < Date.now() + 120_000
    : false;

  if (isExpiring) {
    try {
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshed.session) {
        return refreshed.session;
      }
    } catch {
      // Fallback to getUser which auto-refreshes against Supabase auth server
      const { data: userRes } = await supabase.auth.getUser();
      if (userRes?.user) {
        const { data: secondCheck } = await supabase.auth.getSession();
        return secondCheck.session;
      }
    }
  }

  return data.session;
}

export function getUser(session: Session | null): User | null {
  return session?.user ?? null;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return data.subscription;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('username_available', { u: username });
  if (error) throw error;
  return data as boolean;
}
