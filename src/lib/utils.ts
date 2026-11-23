import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Get the user's local date as YYYY-MM-DD string */
export function getLocalDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD
}

/** Parse a YYYY-MM-DD string into a local Date (noon to avoid DST issues) */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/** Add days to a date string, returning a new YYYY-MM-DD string */
export function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return getLocalDate(d);
}

/** Check if two date strings refer to the same day */
export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

/** Check if date is today */
export function isToday(dateStr: string): boolean {
  return dateStr === getLocalDate();
}

/** Format date for display: "Today", "Yesterday", or "Thu, 24 Oct" */
export function formatDateDisplay(dateStr: string): string {
  const today = getLocalDate();
  if (dateStr === today) return 'Today';
  if (dateStr === addDays(today, -1)) return 'Yesterday';
  if (dateStr === addDays(today, 1)) return 'Tomorrow';
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** Round kcal to whole, macros to 1 decimal */
export function fmtKcal(val: number | null | undefined): string {
  if (val == null) return '0';
  return Math.round(val).toString();
}

export function fmtMacro(val: number | null | undefined): string {
  if (val == null) return '0';
  return val.toFixed(1);
}

/** Format quantity with serving label: "2 × 1 roti" or "150 g" */
export function fmtQuantity(quantity: number | null, servingLabel: string | null): string {
  if (quantity == null) return '';
  if (!servingLabel || servingLabel === 'g') {
    return `${fmtMacro(quantity)} g`;
  }
  return `${fmtMacro(quantity)} × ${servingLabel}`;
}

/** Clamp a number between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/** Map a Supabase auth error to a user-friendly message */
export function mapAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred.';
  const errObj = error as { message?: string; error_description?: string };
  const rawMsg = errObj.message || errObj.error_description || String(error);
  const msg = rawMsg.toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Wrong username or password.';
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'That username is already taken.';
  }
  if (msg.includes('email rate limit') || msg.includes('rate limit')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network error. Check your connection and try again.';
  }
  if (msg.includes('password') && msg.includes('short')) {
    return 'Password must be at least 8 characters.';
  }
  return rawMsg;
}
