import { Icon } from '@/components/Icon';
import { getLocalDate, addDays, formatDateDisplay } from '@/lib/utils';

interface TodayHeroProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  targetKcal: number;
  consumedKcal: number;
  targetProtein: number;
  consumedProtein: number;
  targetCarbs: number;
  consumedCarbs: number;
  targetFat: number;
  consumedFat: number;
}

export function TodayHero({
  currentDate,
  onDateChange,
  targetKcal,
  consumedKcal,
  targetProtein,
  consumedProtein,
  targetCarbs,
  consumedCarbs,
  targetFat,
  consumedFat,
}: TodayHeroProps) {
  const isToday = currentDate === getLocalDate();
  const remainingKcal = Math.max(0, targetKcal - consumedKcal);

  const proteinPct = Math.min(100, targetProtein > 0 ? Math.round((consumedProtein / targetProtein) * 100) : 0);
  const carbsPct = Math.min(100, targetCarbs > 0 ? Math.round((consumedCarbs / targetCarbs) * 100) : 0);
  const fatPct = Math.min(100, targetFat > 0 ? Math.round((consumedFat / targetFat) * 100) : 0);

  return (
    <section className="bg-header-panel text-header-text rounded-3xl p-space-lg flex flex-col gap-space-md shadow-sm">
      {/* Date Switcher Navigation */}
      <div className="flex items-center justify-between">
        <button
          aria-label="Previous day"
          onClick={() => onDateChange(addDays(currentDate, -1))}
          className="w-9 h-9 rounded-full bg-primary/40 flex items-center justify-center text-header-text hover:bg-primary/60 transition-transform active:scale-95"
          type="button"
        >
          <Icon name="chevron_left" size={20} />
        </button>

        <div
          onClick={() => onDateChange(getLocalDate())}
          className="flex items-center gap-space-xs text-center cursor-pointer select-none"
          title="Click to jump to today"
        >
          <span className="font-headline-sm text-headline-sm text-header-text">
            {isToday ? 'Today' : 'Viewing'}
          </span>
          <span className="font-body-sm text-body-sm text-header-text/75">
            • {formatDateDisplay(currentDate)}
          </span>
        </div>

        <button
          aria-label="Next day"
          onClick={() => onDateChange(addDays(currentDate, 1))}
          className="w-9 h-9 rounded-full bg-primary/40 flex items-center justify-center text-header-text hover:bg-primary/60 transition-transform active:scale-95"
          type="button"
        >
          <Icon name="chevron_right" size={20} />
        </button>
      </div>

      {/* Calories Focal Readout */}
      <div className="flex flex-col items-center justify-center py-space-sm text-center">
        <span className="font-display-hero-mobile text-display-hero-mobile tracking-tight text-header-text leading-none">
          {remainingKcal.toLocaleString()}
        </span>
        <p className="font-body-md text-body-md text-header-text/85 mt-space-xs flex items-center gap-space-xs">
          <span>calories left</span>
          <span className="text-header-text/60">of {targetKcal.toLocaleString()} target</span>
        </p>
      </div>

      {/* Macronutrient Progress Bars */}
      <div className="flex flex-col gap-space-sm pt-space-xs">
        {/* Protein Bar */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-baseline font-body-sm text-body-sm text-header-text/90">
            <span className="font-label-md text-label-md text-header-text">Protein</span>
            <span className="text-header-text/80">
              <strong className="font-semibold text-header-text">{Math.round(consumedProtein)}</strong> / {Math.round(targetProtein)} g
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-primary/60 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-status-safe transition-all duration-300"
              style={{ width: `${proteinPct}%` }}
            />
          </div>
        </div>

        {/* Carbs Bar */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-baseline font-body-sm text-body-sm text-header-text/90">
            <span className="font-label-md text-label-md text-header-text">Carbs</span>
            <span className="text-header-text/80">
              <strong className="font-semibold text-header-text">{Math.round(consumedCarbs)}</strong> / {Math.round(targetCarbs)} g
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-primary/60 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-status-safe transition-all duration-300"
              style={{ width: `${carbsPct}%` }}
            />
          </div>
        </div>

        {/* Fat Bar */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-baseline font-body-sm text-body-sm text-header-text/90">
            <span className="font-label-md text-label-md text-header-text">Fat</span>
            <span className="text-header-text/80">
              <strong className="font-semibold text-header-text">{Math.round(consumedFat)}</strong> / {Math.round(targetFat)} g
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-primary/60 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-status-safe transition-all duration-300"
              style={{ width: `${fatPct}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
