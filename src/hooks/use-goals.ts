import { useQuery } from '@tanstack/react-query';
import { getGoals } from '@/data/goals';
import { useAuth } from '@/hooks/use-auth';

export function useGoals() {
  const { user } = useAuth();
  const userId = user?.id ?? 'guest';

  return useQuery({
    queryKey: ['goals', userId],
    queryFn: getGoals,
    staleTime: 60_000,
  });
}
