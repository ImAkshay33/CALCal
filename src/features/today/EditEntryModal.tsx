import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { GramWheelAdjuster } from '@/components/GramWheelAdjuster';
import type { FoodLog, MealType } from '@/types/database';

interface EditEntryModalProps {
  log: FoodLog;
  onClose: () => void;
  onSave: (id: string, updates: Partial<FoodLog>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EditEntryModal({ log, onClose, onSave, onDelete }: EditEntryModalProps) {
  const [meal, setMeal] = useState<MealType>(log.meal || 'lunch');
  const [quantity, setQuantity] = useState<number>(log.quantity ?? 1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Baseline per-unit nutrients
  const baseKcal = (log.energy_kcal ?? 0) / Math.max(1, log.quantity ?? 1);
  const baseProtein = (log.protein_g ?? 0) / Math.max(1, log.quantity ?? 1);
  const baseCarbs = (log.carbs_g ?? 0) / Math.max(1, log.quantity ?? 1);
  const baseFat = (log.fat_g ?? 0) / Math.max(1, log.quantity ?? 1);

  // Dynamic calculated totals
  const totalKcal = Math.round(baseKcal * quantity);
  const totalProtein = (baseProtein * quantity).toFixed(1);
  const totalCarbs = (baseCarbs * quantity).toFixed(1);
  const totalFat = (baseFat * quantity).toFixed(1);

  const isGrams = !log.serving_label || log.serving_label === 'g';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(log.id, {
        meal,
        quantity,
        energy_kcal: totalKcal,
        protein_g: parseFloat(totalProtein),
        carbs_g: parseFloat(totalCarbs),
        fat_g: parseFloat(totalFat),
        grams: isGrams ? quantity : (log.grams ? Math.round((log.grams / Math.max(1, log.quantity ?? 1)) * quantity) : null),
      });
      onClose();
    } catch {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove ${log.label} from your diary?`)) return;
    setIsDeleting(true);
    try {
      await onDelete(log.id);
      onClose();
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div
        className="w-full max-w-lg bg-card-background rounded-t-[28px] sm:rounded-2xl p-space-md shadow-2xl flex flex-col gap-space-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div className="w-full flex justify-center pt-0 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-ink-secondary/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-space-sm">
          <div>
            <span className="font-label-sm text-label-sm text-ink-secondary">Editing logged entry</span>
            <h2 className="font-title-md text-title-md text-ink-primary font-semibold truncate max-w-[280px]">
              {log.label}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container-high text-ink-secondary hover:text-ink-primary flex items-center justify-center transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Meal Selector Pills */}
        <div className="space-y-1.5">
          <label className="font-label-sm text-label-sm text-ink-secondary block">Assigned meal</label>
          <div className="w-full bg-page-background p-1 rounded-2xl flex items-center justify-between gap-1 shadow-sm">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMeal(m)}
                className={`flex-1 py-1.5 text-center rounded-xl font-label-sm text-label-sm capitalize transition-colors ${
                  meal === m
                    ? 'bg-header-panel text-header-text font-semibold shadow-sm'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity Stepper or Gram Wheel */}
        {isGrams ? (
          <GramWheelAdjuster grams={quantity} onChange={setQuantity} />
        ) : (
          <div className="bg-page-background rounded-xl p-space-md flex items-center justify-between">
            <div>
              <span className="font-label-sm text-label-sm text-ink-secondary block">Portion size</span>
              <span className="font-body-md text-body-md text-ink-primary font-medium">
                {log.serving_label || 'Servings'}
              </span>
            </div>

            <div className="flex items-center gap-space-sm bg-card-background rounded-xl p-1 px-2 border border-border-subtle">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity(Math.max(0.5, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-page-background text-ink-primary font-title-sm flex items-center justify-center active:scale-95 transition-transform"
              >
                <Icon name="remove" size={18} />
              </button>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="font-numeral-lg text-numeral-lg text-ink-primary w-14 text-center bg-transparent outline-none font-semibold"
              />
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-page-background text-ink-primary font-title-sm flex items-center justify-center active:scale-95 transition-transform"
              >
                <Icon name="add" size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Calculated Nutrition Preview */}
        <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm">
          <div className="flex justify-between items-baseline">
            <span className="font-label-md text-label-md text-ink-secondary">Recalculated energy</span>
            <div className="flex items-baseline gap-1">
              <span className="font-numeral-hero text-numeral-hero text-primary-container font-bold">
                {totalKcal}
              </span>
              <span className="font-title-sm text-title-sm text-ink-secondary">kcal</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-card-background rounded-lg p-2 flex flex-col items-center">
              <span className="font-label-sm text-label-sm text-ink-secondary">Protein</span>
              <span className="font-title-sm text-title-sm text-status-safe font-semibold">{totalProtein}g</span>
            </div>
            <div className="bg-card-background rounded-lg p-2 flex flex-col items-center">
              <span className="font-label-sm text-label-sm text-ink-secondary">Carbs</span>
              <span className="font-title-sm text-title-sm text-ink-primary font-semibold">{totalCarbs}g</span>
            </div>
            <div className="bg-card-background rounded-lg p-2 flex flex-col items-center">
              <span className="font-label-sm text-label-sm text-ink-secondary">Fat</span>
              <span className="font-title-sm text-title-sm text-ink-primary font-semibold">{totalFat}g</span>
            </div>
          </div>
        </div>

        {/* Submission Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="w-full py-3.5 rounded-xl bg-action-primary text-action-text font-title-sm text-title-sm font-semibold flex items-center justify-center gap-space-xs shadow-[0_8px_24px_-4px_rgba(26,38,32,0.12)] active:scale-[0.98] transition-transform hover:brightness-105 disabled:opacity-60"
          >
            <Icon name="check" size={20} />
            <span>{isSaving ? 'Saving...' : 'Update entry'}</span>
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="w-full py-2.5 rounded-xl font-label-md text-label-md text-error hover:bg-error-container/40 text-center transition-colors flex items-center justify-center gap-1.5"
          >
            <Icon name="delete" size={18} />
            <span>{isDeleting ? 'Deleting...' : 'Delete from diary'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
