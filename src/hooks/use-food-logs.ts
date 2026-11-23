import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFoodLogs, deleteFoodLog } from '@/data/food-logs';
import { useAuth } from '@/hooks/use-auth';
import type { FoodLog, MealType } from '@/types/database';

export function useFoodLogs(date: string) {
  const { user } = useAuth();
  const userId = user?.id ?? 'guest';

  return useQuery({
    queryKey: ['food-logs', userId, date],
    queryFn: () => getFoodLogs(date),
    staleTime: 5_000,
  });
}

/** Group food logs by meal type */
export function groupByMeal(logs: FoodLog[]): Record<MealType, FoodLog[]> {
  const grouped: Record<MealType, FoodLog[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  for (const log of logs) {
    const meal = log.meal ?? 'snack';
    grouped[meal].push(log);
  }
  return grouped;
}

/** Sum macros from a list of food logs */
export function sumMacros(logs: FoodLog[]) {
  return logs.reduce(
    (acc, log) => ({
      energy_kcal: acc.energy_kcal + (log.energy_kcal ?? 0),
      protein_g: acc.protein_g + (log.protein_g ?? 0),
      carbs_g: acc.carbs_g + (log.carbs_g ?? 0),
      fat_g: acc.fat_g + (log.fat_g ?? 0),
      fiber_g: acc.fiber_g + (log.fiber_g ?? 0),
      sugar_g: acc.sugar_g + (log.sugar_g ?? 0),
    }),
    { energy_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 }
  );
}

export function useDeleteFoodLog(date: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFoodLog,
    // Optimistic update: remove from cache immediately
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['food-logs', date] });
      const previous = queryClient.getQueryData<FoodLog[]>(['food-logs', date]);
      queryClient.setQueryData<FoodLog[]>(['food-logs', date], (old) =>
        old?.filter((log) => log.id !== deletedId) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['food-logs', date], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs', date] });
    },
  });
}
