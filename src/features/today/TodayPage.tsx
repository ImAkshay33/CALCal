import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getLocalDate } from '@/lib/utils';
import { useFoodLogs, useDeleteFoodLog, groupByMeal, sumMacros } from '@/hooks/use-food-logs';
import { useGoals } from '@/hooks/use-goals';
import { updateFoodLog } from '@/data/food-logs';
import { TodayHero } from './TodayHero';
import { MicrosCard } from './MicrosCard';
import { MealTimeline } from './MealTimeline';
import { EditEntryModal } from './EditEntryModal';
import { Icon } from '@/components/Icon';
import type { MealType, FoodLog } from '@/types/database';

export function TodayPage() {
  const [currentDate, setCurrentDate] = useState(() => getLocalDate());
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading: logsLoading } = useFoodLogs(currentDate);
  const { data: goals } = useGoals();
  const deleteMutation = useDeleteFoodLog(currentDate);

  const handleSaveEdit = async (id: string, updates: Partial<FoodLog>) => {
    await updateFoodLog(id, updates);
    queryClient.invalidateQueries({ queryKey: ['food-logs', currentDate] });
    queryClient.invalidateQueries({ queryKey: ['progress'] });
  };

  const handleDeleteFromModal = async (id: string) => {
    deleteMutation.mutate(id);
  };

  const grouped = groupByMeal(logs);
  const macros = sumMacros(logs);

  const targetKcal = goals?.energy_kcal ?? 2000;
  const targetProtein = goals?.protein_g ?? 100;
  const targetCarbs = goals?.carbs_g ?? 250;
  const targetFat = goals?.fat_g ?? 65;

  // Aggregate micros from logs
  const microTotals: Record<string, { current: number; unit: string }> = {
    Iron: { current: 0, unit: 'mg' },
    Calcium: { current: 0, unit: 'mg' },
    'Vitamin C': { current: 0, unit: 'mg' },
    Fiber: { current: macros.fiber_g, unit: 'g' },
  };

  for (const log of logs) {
    if (log.micros && typeof log.micros === 'object') {
      const m = log.micros as Record<string, number>;
      if (m.iron_mg) microTotals.Iron.current += Number(m.iron_mg);
      if (m.calcium_mg) microTotals.Calcium.current += Number(m.calcium_mg);
      if (m.vitamin_c_mg) microTotals['Vitamin C'].current += Number(m.vitamin_c_mg);
    }
  }

  const microTargets = goals?.micro_targets as Record<string, number> | undefined;
  const microsList = [
    {
      name: 'Iron',
      unit: 'mg',
      current: Math.round(microTotals.Iron.current * 10) / 10,
      target: microTargets?.iron_mg ?? 18,
    },
    {
      name: 'Calcium',
      unit: 'mg',
      current: Math.round(microTotals.Calcium.current),
      target: microTargets?.calcium_mg ?? 1000,
    },
    {
      name: 'Vitamin C',
      unit: 'mg',
      current: Math.round(microTotals['Vitamin C'].current),
      target: microTargets?.vitamin_c_mg ?? 80,
    },
    {
      name: 'Fiber',
      unit: 'g',
      current: Math.round(macros.fiber_g * 10) / 10,
      target: 35,
    },
  ];

  const handleAddFood = (meal?: MealType) => {
    navigate(meal ? `/foods?meal=${meal}&date=${currentDate}` : `/foods?date=${currentDate}`);
  };

  return (
    <div className="flex flex-col w-full pb-12 gap-space-lg">
      {/* Hero Dashboard Header Panel */}
      <TodayHero
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        targetKcal={targetKcal}
        consumedKcal={macros.energy_kcal}
        targetProtein={targetProtein}
        consumedProtein={macros.protein_g}
        targetCarbs={targetCarbs}
        consumedCarbs={macros.carbs_g}
        targetFat={targetFat}
        consumedFat={macros.fat_g}
        targetFiber={goals?.fiber_g ?? 30}
        consumedFiber={macros.fiber_g}
      />

      {/* Micronutrients Collapsible Ledger Card */}
      <MicrosCard micros={microsList} />

      {/* Meal Timeline Ledger */}
      {logsLoading ? (
        <div className="p-8 text-center text-ink-secondary font-body-md animate-pulse">
          Loading food ledger...
        </div>
      ) : (
        <MealTimeline
          grouped={grouped}
          onDelete={(id) => deleteMutation.mutate(id)}
          onEdit={(log) => setEditingLog(log)}
          onAddFood={handleAddFood}
          deletingId={deleteMutation.isPending ? deleteMutation.variables : null}
        />
      )}

      {/* Edit Entry Modal */}
      {editingLog && (
        <EditEntryModal
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSave={handleSaveEdit}
          onDelete={handleDeleteFromModal}
        />
      )}

      {/* Main Floating Action Button (Reserved Electric Purple) */}
      <div className="fixed bottom-20 inset-x-0 z-40 flex justify-center pointer-events-none">
        <button
          type="button"
          aria-label="Add food"
          onClick={() => handleAddFood()}
          className="pointer-events-auto flex items-center gap-space-xs bg-action-primary text-action-text px-6 py-3.5 rounded-full font-title-sm text-title-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_8px_24px_-4px_rgba(26,38,32,0.18)]"
        >
          <Icon name="add" size={22} />
          <span>Add food</span>
        </button>
      </div>
    </div>
  );
}
