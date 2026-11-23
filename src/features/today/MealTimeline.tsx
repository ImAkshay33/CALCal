import { Icon } from '@/components/Icon';
import type { FoodLog, MealType } from '@/types/database';

interface MealTimelineProps {
  grouped: Record<MealType, FoodLog[]>;
  onDelete: (id: string) => void;
  onAddFood: (meal: MealType) => void;
  deletingId?: string | null;
}

const MEALS: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: 'wb_sunny' },
  { key: 'lunch', label: 'Lunch', icon: 'restaurant' },
  { key: 'dinner', label: 'Dinner', icon: 'nightlight' },
  { key: 'snack', label: 'Snacks', icon: 'bakery_dining' },
];

export function MealTimeline({ grouped, onDelete, onAddFood, deletingId }: MealTimelineProps) {
  return (
    <div className="flex flex-col gap-space-md">
      {MEALS.map((meal) => {
        const logs = grouped[meal.key] ?? [];
        const mealKcal = logs.reduce((sum, l) => sum + (l.energy_kcal ?? 0), 0);
        const hasLogs = logs.length > 0;

        return (
          <section
            key={meal.key}
            className={`rounded-2xl p-space-md flex flex-col gap-space-sm shadow-sm transition-all ${
              hasLogs ? 'bg-card-background' : 'bg-card-background/75'
            }`}
          >
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-baseline gap-space-xs">
                <h3 className="font-title-md text-title-md text-ink-primary">{meal.label}</h3>
              </div>
              <span className="font-numeral-lg text-numeral-lg text-ink-primary">
                {Math.round(mealKcal)}{' '}
                <span className="font-body-sm text-body-sm font-normal text-ink-secondary">kcal</span>
              </span>
            </div>

            {hasLogs ? (
              <div className="flex flex-col gap-space-xs">
                {logs.map((log) => {
                  const title = log.label || 'Food item';
                  const servingDesc = log.serving_label
                    ? `${log.quantity ?? 1} × ${log.serving_label}`
                    : `${log.grams ?? log.quantity ?? 100} g`;

                  const isDeleting = deletingId === log.id;

                  return (
                    <div
                      key={log.id}
                      className={`group flex items-center justify-between py-space-xs px-space-sm bg-page-background/50 rounded-xl hover:bg-page-background transition-all ${
                        isDeleting ? 'opacity-40 pointer-events-none' : ''
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-space-xs">
                        <div className="flex items-center gap-space-xs">
                          <span className="font-title-sm text-title-sm text-ink-primary truncate">
                            {title}
                          </span>
                          {log.entry_type === 'quick_add' && (
                            <span className="text-[10px] font-label-sm text-ink-secondary bg-surface-container-high px-1.5 py-0.5 rounded-full shrink-0">
                              quick add
                            </span>
                          )}
                        </div>
                        <span className="font-body-sm text-body-sm text-ink-secondary">
                          {servingDesc}
                        </span>
                      </div>

                      <div className="flex items-center gap-space-sm shrink-0">
                        <span className="font-headline-sm text-headline-sm text-ink-primary">
                          {Math.round(log.energy_kcal ?? 0)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${title}`}
                          onClick={() => onDelete(log.id)}
                          className="text-ink-secondary/70 hover:text-status-danger p-1 rounded-full transition-colors flex items-center justify-center active:scale-95"
                        >
                          <Icon name="delete" size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-between py-space-md px-space-md bg-page-background/40 rounded-xl">
                <div className="flex items-center gap-space-sm text-ink-secondary">
                  <Icon name={meal.icon} size={20} className="opacity-60" />
                  <span className="font-body-md text-body-md">Nothing logged yet</span>
                </div>
                <button
                  type="button"
                  onClick={() => onAddFood(meal.key)}
                  className="text-ink-primary hover:text-action-primary text-label-sm font-label-sm flex items-center gap-1 font-semibold transition-colors"
                >
                  <Icon name="add" size={16} /> Log
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
