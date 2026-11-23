import { useQuery } from '@tanstack/react-query';
import { getGoals } from '@/data/goals';

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: getGoals,
    staleTime: 60_000 * 5, // goals change rarely
  });
}
