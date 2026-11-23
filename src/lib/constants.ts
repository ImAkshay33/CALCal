import type { MealType } from '@/types/database';

export const MEALS: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch', label: 'Lunch', icon: '☀️' },
  { key: 'dinner', label: 'Dinner', icon: '🌙' },
  { key: 'snack', label: 'Snack', icon: '🍿' },
];

export const THEME = {
  forest: '#1f3a2b',
  forestLight: '#2d5a40',
  forestDark: '#152819',
  linen: '#e7dfcf',
  linenDark: '#d4c9b4',
  linenLight: '#f5f1ea',
  accent: '#7b2cff',
  accentLight: '#9b5cff',
  accentDark: '#5a10d9',
} as const;

export const MACRO_COLORS = {
  protein: '#3b82f6',
  carbs: '#f59e0b',
  fat: '#ef4444',
  fiber: '#16a34a',
} as const;

/** Default goals created by the DB trigger, mirrored here for display before the query resolves */
export const DEFAULT_GOALS = {
  energy_kcal: 2000,
  protein_g: 100,
  carbs_g: 250,
  fat_g: 65,
  fiber_g: 30,
} as const;

export const AUTH_EMAIL_DOMAIN = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'calcal.app';
