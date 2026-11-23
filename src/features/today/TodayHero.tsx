import { Icon } from '@/components/Icon';
import { getLocalDate, addDays, formatDateDisplay, getMagnitudeStatus } from '@/lib/utils';

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
  targetFiber?: number;
  consumedFiber?: number;
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
  targetFiber = 30,
  consumedFiber = 0,
}: TodayHeroProps) {
  const isToday = currentDate === getLocalDate();
  const isExceeded = consumedKcal > targetKcal;
  const remainingKcal = Math.max(0, targetKcal - consumedKcal);
  const overKcal = Math.max(0, consumedKcal - targetKcal);

  // Dynamic magnitude status for energy & macros (Protein, Carbs, Fat, Fiber)
  const calStatus = getMagnitudeStatus(consumedKcal, targetKcal);
  const proteinStatus = getMagnitudeStatus(consumedProtein, targetProtein);
  const carbsStatus = getMagnitudeStatus(consumedCarbs, targetCarbs);
  const fatStatus = getMagnitudeStatus(consumedFat, targetFat);
  const fiberStatus = getMagnitudeStatus(consumedFiber, targetFiber);

  return (
    <section className="bg-header-panel text-header-text rounded-3xl p-space-lg flex flex-col gap-space-md shadow-sm stroke-sheen">
      {/* Date Switcher Navigation */}
      <div className="flex items-center justify-between">
        <button
          aria-label="Previous day"
          onClick={() => onDateChange(addDays(currentDate, -1))}
          className="w-9 h-9 rounded-full bg-primary/40 flex items-center justify-center text-header-text hover:bg-primary/60 transition-transform active:scale-95 hover-nudge"
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
          className="w-9 h-9 rounded-full bg-primary/40 flex items-center justify-center text-header-text hover:bg-primary/60 transition-transform active:scale-95 hover-nudge"
          type="button"
        >
          <Icon name="chevron_right" size={20} />
        </button>
      </div>

      {/* Calories Focal Readout with Magnitude Color: Main metric is CALORIES CONSUMED */}
      <div className="flex flex-col items-center justify-center py-space-xs text-center">
        <div className="flex items-baseline gap-1.5">
          <span className={`font-display-hero-mobile text-display-hero-mobile tracking-tight leading-none font-bold ${
            isExceeded
              ? (calStatus.tier === 'danger' ? 'text-red-400' : 'text-amber-400')
              : 'text-header-text'
          }`}>
            {Math.round(consumedKcal).toLocaleString()}
          </span>
          <span className="font-title-sm text-title-sm text-header-text/80 font-medium">kcal</span>
        </div>

        <p className="font-body-md text-body-md text-header-text/85 mt-space-xs flex items-center justify-center gap-1.5 flex-wrap">
          <span>calories consumed</span>
          <span className="text-header-text/60">• of {targetKcal.toLocaleString()} target</span>
          {isExceeded ? (
            <span className={`font-semibold inline-flex items-center gap-1 ${calStatus.tier === 'danger' ? 'text-red-400' : 'text-amber-400'}`}>
              <Icon name={calStatus.tier === 'danger' ? 'error' : 'warning'} size={15} />
              (+{overKcal.toLocaleString()} over)
            </span>
          ) : (
            <span className="text-header-text/75">
              ({remainingKcal.toLocaleString()} left)
            </span>
          )}
        </p>

        {/* Magnitude Calorie Gauge Bar */}
        <div className="w-full max-w-xs mt-2.5 h-2 rounded-full bg-primary/60 overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-400 ${calStatus.barColor}`}
            style={{ width: `${calStatus.barWidth}%` }}
          />
        </div>
      </div>

      {/* Macronutrient Progress Bars with Magnitude Color */}
      <div className="flex flex-col gap-space-sm pt-space-xs">
        {/* Protein Bar */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-baseline font-body-sm text-body-sm text-header-text/90">
            <div className="flex items-center gap-1.5">
              <span className="font-label-md text-label-md text-header-text">Protein</span>
              {proteinStatus.pct > 100 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  proteinStatus.tier === 'danger' ? 'bg-red-500/25 text-red-300' : 'bg-amber-500/25 text-amber-300'
                }`}>
                  {proteinStatus.pct}%
                </span>
              )}
            </div>
            <span className="text-header-text/80">
              <strong className="font-semibold text-header-text">{Math.round(consumedProtein)}</strong> / {Math.round(targetProtein)} g
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-primary/60 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${proteinStatus.barColor}`}
              style={{ width: `${proteinStatus.barWidth}%` }}
            />
          </div>
        </div>

        {/* Carbs Bar */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-baseline font-body-sm text-body-sm text-header-text/90">
            <div className="flex items-center gap-1.5">
              <span className="font-label-md text-label-md text-header-text">Carbs</span>
              {carbsStatus.pct > 100 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  carbsStatus.tier === 'danger' ? 'bg-red-500/25 text-red-300' : 'bg-amber-500/25 text-amber-300'
                }`}>
                  {carbsStatus.pct}%
                </span>
              )}
            </div>
            <span className="text-header-text/80">
              <strong className="font-semibold text-header-text">{Math.round(consumedCarbs)}</strong> / {Math.round(targetCarbs)} g
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-primary/60 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${carbsStatus.barColor}`}
              style={{ width: `${carbsStatus.barWidth}%` }}
            />
          </div>
        </div>

        {/* Fat Bar */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-baseline font-body-sm text-body-sm text-header-text/90">
            <div className="flex items-center gap-1.5">
              <span className="font-label-md text-label-md text-header-text">Fat</span>
              {fatStatus.pct > 100 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  fatStatus.tier === 'danger' ? 'bg-red-500/25 text-red-300' : 'bg-amber-500/25 text-amber-300'
                }`}>
                  {fatStatus.pct}%
                </span>
              )}
            </div>
            <span className="text-header-text/80">
              <strong className="font-semibold text-header-text">{Math.round(consumedFat)}</strong> / {Math.round(targetFat)} g
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-primary/60 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${fatStatus.barColor}`}
              style={{ width: `${fatStatus.barWidth}%` }}
            />
          </div>
        </div>

        {/* Fiber Bar (Tracked Alongside Macros) */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-baseline font-body-sm text-body-sm text-header-text/90">
            <div className="flex items-center gap-1.5">
              <span className="font-label-md text-label-md text-header-text">Fiber</span>
              {fiberStatus.pct > 100 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  fiberStatus.tier === 'danger' ? 'bg-red-500/25 text-red-300' : 'bg-amber-500/25 text-amber-300'
                }`}>
                  {fiberStatus.pct}%
                </span>
              )}
            </div>
            <span className="text-header-text/80">
              <strong className="font-semibold text-header-text">{Math.round(consumedFiber)}</strong> / {Math.round(targetFiber)} g
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-primary/60 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${fiberStatus.barColor}`}
              style={{ width: `${fiberStatus.barWidth}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
