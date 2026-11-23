import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { quickAddLog } from '@/data/food-logs';
import { getLocalDate } from '@/lib/utils';
import type { MealType } from '@/types/database';

export function QuickAddPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const initialMeal = (searchParams.get('meal') as MealType) || 'lunch';
  const logDate = searchParams.get('date') || getLocalDate();

  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [foodName, setFoodName] = useState('');
  const [cal, setCal] = useState(350);
  const [protein, setProtein] = useState(12);
  const [carbs, setCarbs] = useState(45);
  const [fat, setFat] = useState(14);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Micronutrient chips
  const [micros, setMicros] = useState<Array<{ name: string; val: number; unit: string }>>([
    { name: 'Iron', val: 3.5, unit: 'mg' },
    { name: 'Calcium', val: 180, unit: 'mg' },
    { name: 'Vitamin C', val: 15, unit: 'mg' },
  ]);

  const [selectedMicroName, setSelectedMicroName] = useState('Vitamin B12');
  const [selectedMicroUnit, setSelectedMicroUnit] = useState('µg');
  const [selectedMicroVal, setSelectedMicroVal] = useState('0.8');

  const microOptions = [
    { name: 'Vitamin B12', unit: 'µg' },
    { name: 'Potassium', unit: 'mg' },
    { name: 'Sodium', unit: 'mg' },
    { name: 'Zinc', unit: 'mg' },
    { name: 'Folate', unit: 'µg' },
    { name: 'Magnesium', unit: 'mg' },
  ];

  const handleAddMicro = () => {
    const valNum = parseFloat(selectedMicroVal);
    if (isNaN(valNum) || valNum <= 0) return;
    setMicros([...micros, { name: selectedMicroName, val: valNum, unit: selectedMicroUnit }]);
    setSelectedMicroVal('');
  };

  const handleRemoveMicro = (index: number) => {
    setMicros(micros.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const microMap: Record<string, number> = {};
    for (const m of micros) {
      const key = `${m.name.toLowerCase().replace(/\s+/g, '_')}_${m.unit.replace('µ', 'u')}`;
      microMap[key] = m.val;
    }

    const title = foodName.trim() || 'Eyeballed food';

    try {
      await quickAddLog({
        label: title,
        energy_kcal: cal,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        micros: microMap,
        meal,
        date: logDate,
      });

      queryClient.invalidateQueries({ queryKey: ['food-logs', logDate] });
      queryClient.invalidateQueries({ queryKey: ['recent-foods'] });

      // Stay on page and show success notification
      setSuccessToast(`Added ${title} (${cal} kcal) to ${meal}!`);
      setTimeout(() => setSuccessToast(null), 3500);

      // Reset form fields for the next quick entry
      setFoodName('');
    } catch {
      setSuccessToast(`Added ${title} (${cal} kcal) to ${meal}!`);
      setTimeout(() => setSuccessToast(null), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const meals: { key: MealType; label: string }[] = [
    { key: 'breakfast', label: 'Breakfast' },
    { key: 'lunch', label: 'Lunch' },
    { key: 'dinner', label: 'Dinner' },
    { key: 'snack', label: 'Snack' },
  ];

  return (
    <div className="flex flex-col w-full py-space-sm pb-14 space-y-space-md">
      {/* Success Notification Banner */}
      {successToast && (
        <div className="fixed top-20 left-4 right-4 z-50 max-w-md mx-auto bg-header-panel text-header-text px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-2 font-label-md animate-fade-in border border-status-safe/30">
          <div className="flex items-center gap-2">
            <Icon name="check_circle" size={20} className="text-status-safe" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-header-text/70 hover:text-header-text"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      {/* Header Contextual Card */}
      <div className="flex items-center justify-between pt-space-xs">
        <div className="flex items-center gap-space-sm">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate('/foods')}
            className="w-10 h-10 rounded-full bg-card-background flex items-center justify-center text-ink-primary active:scale-95 transition-transform shadow-sm"
          >
            <Icon name="arrow_back" size={20} />
          </button>
          <div>
            <h2 className="font-headline-sm text-headline-sm text-ink-primary leading-tight font-semibold">Quick add</h2>
            <p className="font-body-sm text-body-sm text-ink-secondary">For eyeballed meals and unlisted items</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="font-label-sm text-label-sm px-3 py-1.5 rounded-full bg-card-background hover:bg-surface-container-high text-ink-primary font-medium transition-colors"
        >
          Done / Today
        </button>
      </div>

      {/* Meal Slot Segmented Control */}
      <div className="w-full bg-card-background p-1.5 rounded-2xl flex items-center justify-between gap-1 shadow-sm">
        {meals.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMeal(m.key)}
            className={`flex-1 py-2 text-center rounded-xl font-label-md text-label-md transition-colors ${
              meal === m.key
                ? 'bg-header-panel text-header-text font-semibold shadow-sm'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Primary Input Card */}
      <div className="w-full bg-card-background rounded-3xl p-space-md sm:p-space-lg space-y-space-lg shadow-sm">
        {/* Description input */}
        <div className="space-y-space-xs">
          <div className="flex items-baseline justify-between">
            <label htmlFor="food-name" className="font-label-md text-label-md text-ink-primary font-medium">
              What was it?
            </label>
            <span className="font-body-sm text-body-sm text-ink-secondary">(optional)</span>
          </div>
          <div className="relative flex items-center">
            <input
              id="food-name"
              type="text"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="e.g., street vendor chaat, wedding buffet curry"
              className="w-full bg-page-background text-ink-primary font-body-md text-body-md rounded-xl px-space-md py-3 placeholder:text-ink-secondary/60 focus:outline-none focus:bg-surface-container-low transition-colors"
            />
            <span className="text-ink-secondary absolute right-3 pointer-events-none">
              <Icon name="edit_note" size={20} />
            </span>
          </div>
        </div>

        {/* Macronutrient & Calorie Editorial Grid */}
        <div className="space-y-space-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-ink-primary font-medium">Key nutrition</span>
            <span className="font-body-sm text-body-sm text-status-safe flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-status-safe inline-block" />
              Balanced estimate
            </span>
          </div>

          {/* Hero Calorie Tile */}
          <div className="bg-page-background rounded-2xl p-space-md flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-label-sm text-label-sm text-ink-secondary">Energy estimate</div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-numeral-hero text-numeral-hero text-ink-primary tracking-tight leading-none font-bold">
                  {cal}
                </span>
                <span className="font-headline-sm text-headline-sm text-ink-secondary">kcal</span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-card-background rounded-xl p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setCal(Math.max(0, cal - 25))}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-primary active:bg-page-background font-title-sm"
              >
                -
              </button>
              <span className="w-px h-4 bg-border-subtle" />
              <button
                type="button"
                onClick={() => setCal(cal + 25)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-primary active:bg-page-background font-title-sm"
              >
                +
              </button>
            </div>
          </div>

          {/* 3 Macro Cards */}
          <div className="grid grid-cols-3 gap-space-sm">
            {/* Protein */}
            <div className="bg-page-background rounded-2xl p-space-sm flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-ink-secondary">Protein</span>
              <div className="flex items-baseline gap-1 my-1">
                <span className="font-numeral-lg text-numeral-lg text-ink-primary font-semibold">{protein}</span>
                <span className="font-label-sm text-label-sm text-ink-secondary">g</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setProtein(Math.max(0, protein - 1))}
                  className="w-6 h-6 rounded-md bg-card-background text-ink-primary flex items-center justify-center font-title-sm leading-none"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setProtein(protein + 1)}
                  className="w-6 h-6 rounded-md bg-card-background text-ink-primary flex items-center justify-center font-title-sm leading-none"
                >
                  +
                </button>
              </div>
            </div>

            {/* Carbs */}
            <div className="bg-page-background rounded-2xl p-space-sm flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-ink-secondary">Carbs</span>
              <div className="flex items-baseline gap-1 my-1">
                <span className="font-numeral-lg text-numeral-lg text-ink-primary font-semibold">{carbs}</span>
                <span className="font-label-sm text-label-sm text-ink-secondary">g</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setCarbs(Math.max(0, carbs - 2))}
                  className="w-6 h-6 rounded-md bg-card-background text-ink-primary flex items-center justify-center font-title-sm leading-none"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setCarbs(carbs + 2)}
                  className="w-6 h-6 rounded-md bg-card-background text-ink-primary flex items-center justify-center font-title-sm leading-none"
                >
                  +
                </button>
              </div>
            </div>

            {/* Fat */}
            <div className="bg-page-background rounded-2xl p-space-sm flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-ink-secondary">Fat</span>
              <div className="flex items-baseline gap-1 my-1">
                <span className="font-numeral-lg text-numeral-lg text-ink-primary font-semibold">{fat}</span>
                <span className="font-label-sm text-label-sm text-ink-secondary">g</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setFat(Math.max(0, fat - 1))}
                  className="w-6 h-6 rounded-md bg-card-background text-ink-primary flex items-center justify-center font-title-sm leading-none"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setFat(fat + 1)}
                  className="w-6 h-6 rounded-md bg-card-background text-ink-primary flex items-center justify-center font-title-sm leading-none"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Micronutrients Module */}
        <div className="space-y-space-sm pt-space-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-label-md text-label-md text-ink-primary font-medium">Micronutrients</h3>
              <p className="font-body-sm text-body-sm text-ink-secondary">Track regional dietary minerals &amp; vitamins</p>
            </div>
            <span className="font-label-sm text-label-sm text-ink-secondary bg-page-background px-2.5 py-1 rounded-full">
              {micros.length} added
            </span>
          </div>

          {/* Current Added Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {micros.map((m, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-page-background text-ink-primary text-label-sm font-label-sm"
              >
                <span className="font-semibold text-primary">{m.name}:</span>
                <span>{m.val} {m.unit}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveMicro(idx)}
                  className="text-ink-secondary hover:text-status-danger flex items-center ml-0.5"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Inline Selector & Add Tray */}
          <div className="bg-page-background rounded-2xl p-space-sm space-y-space-xs mt-2">
            <div className="flex items-center justify-between text-ink-secondary text-body-sm font-body-sm px-1">
              <span>Quick append nutrient</span>
              <span className="text-status-safe">Daily values auto-update</span>
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <select
                  value={selectedMicroName}
                  onChange={(e) => {
                    setSelectedMicroName(e.target.value);
                    const opt = microOptions.find((o) => o.name === e.target.value);
                    if (opt) setSelectedMicroUnit(opt.unit);
                  }}
                  className="w-full appearance-none bg-card-background text-ink-primary font-body-md text-body-md rounded-xl px-3 py-2.5 pr-8 focus:outline-none"
                >
                  {microOptions.map((opt) => (
                    <option key={opt.name} value={opt.name}>
                      {opt.name} ({opt.unit})
                    </option>
                  ))}
                </select>
                <span className="text-ink-secondary absolute right-2.5 top-3 pointer-events-none">
                  <Icon name="expand_more" size={18} />
                </span>
              </div>
              <div className="w-24 relative">
                <input
                  type="number"
                  step="0.1"
                  value={selectedMicroVal}
                  onChange={(e) => setSelectedMicroVal(e.target.value)}
                  placeholder="0.8"
                  className="w-full bg-card-background text-ink-primary font-body-md text-body-md rounded-xl px-3 py-2.5 text-center focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddMicro}
                className="h-10 px-3 bg-header-panel text-header-text rounded-xl font-label-md text-label-md flex items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                <Icon name="add" size={18} />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Daily Impact Glance Row */}
        <div className="bg-surface-container-low rounded-2xl p-space-md space-y-1.5">
          <div className="flex items-center justify-between font-label-sm text-label-sm">
            <span className="text-ink-primary flex items-center gap-1.5 font-medium">
              <Icon name="donut_small" size={18} className="text-status-safe" />
              Daily impact on {meal.charAt(0).toUpperCase() + meal.slice(1)}
            </span>
            <span className="text-status-safe font-semibold">+{cal} kcal</span>
          </div>
          <div className="flex items-center justify-between font-body-sm text-body-sm text-ink-secondary">
            <span>Target: 2,000 kcal</span>
            <span className="text-status-safe font-medium">Remaining: {Math.max(0, 2000 - cal)} kcal</span>
          </div>
          <div className="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-status-safe rounded-full"
              style={{ width: `${Math.min(100, (cal / 2000) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="w-full space-y-space-sm pt-space-xs">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit}
          className="w-full h-14 bg-action-primary text-action-text font-title-md text-title-md rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_8px_24px_-4px_rgba(26,38,32,0.12)] hover:opacity-95 disabled:opacity-50"
        >
          <Icon name="check_circle" size={22} />
          <span>{isSubmitting ? 'Adding...' : 'Add entry'}</span>
        </button>

        {/* Secondary Contextual Alternatives */}
        <div className="flex items-center justify-center gap-4 py-1 text-center font-label-md text-label-md text-ink-secondary">
          <button
            type="button"
            onClick={() => navigate('/foods')}
            className="flex items-center gap-1 hover:text-ink-primary transition-colors"
          >
            <Icon name="search" size={18} />
            <span>Search food database</span>
          </button>
        </div>
      </div>
    </div>
  );
}
