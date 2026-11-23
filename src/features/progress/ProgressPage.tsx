import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { useProgressData, type RangeDays } from '@/hooks/use-progress';
import { addWeightLog } from '@/data/food-logs';
import { updateWaterLog } from '@/data/water-logs';
import { getLocalDate } from '@/lib/utils';

export function ProgressPage() {
  const [range, setRange] = useState<RangeDays>('7');
  const queryClient = useQueryClient();

  const { data: progress, isLoading } = useProgressData(range);

  const [showWeightInput, setShowWeightInput] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [waterMl, setWaterMl] = useState<number | null>(null);

  const currentWater = waterMl !== null ? waterMl : (progress?.waterToday ?? 1750);
  const targetWater = 2500;

  const handleAddWeight = async () => {
    const val = parseFloat(newWeight);
    if (!isNaN(val) && val > 30 && val < 250) {
      await addWeightLog(val, getLocalDate());
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      setShowWeightInput(false);
      setNewWeight('');
    }
  };

  const handleAddWater = async (increment = 250) => {
    const next = currentWater + increment;
    setWaterMl(next);
    await updateWaterLog(getLocalDate(), next);
    queryClient.invalidateQueries({ queryKey: ['progress'] });
  };

  if (isLoading || !progress) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-ink-secondary font-body-md animate-pulse">
        Loading progress metrics...
      </div>
    );
  }

  // SVG Chart math for the 7 days
  const chartDays = progress.last7Days;
  const maxKcal = Math.max(2600, ...chartDays.map((d) => d.calories));
  const minKcal = 1200;
  const chartHeight = 100;
  const chartWidth = 300;

  const getY = (kcal: number) => {
    const norm = (kcal - minKcal) / (maxKcal - minKcal);
    return Math.round(chartHeight - norm * 80 + 10);
  };

  const points = chartDays.map((d, i) => {
    const x = Math.round(20 + i * ((chartWidth - 40) / (chartDays.length - 1)));
    const y = getY(d.calories > 0 ? d.calories : progress.targetKcal * 0.9);
    return { x, y, day: d };
  });

  const pathD = points.length > 0
    ? `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')}`
    : 'M 28 69 L 74 52 L 120 18 L 166 78 L 212 58 L 258 12 L 304 71';

  const targetY = getY(progress.targetKcal);
  const avgY = getY(progress.avgKcal);

  return (
    <div className="flex flex-col w-full pb-14 space-y-space-md">
      {/* Range Segmented Control */}
      <div className="w-full bg-card-background rounded-full p-1 flex items-center justify-between shadow-sm mt-1">
        {(
          [
            { key: '7', label: '7 days' },
            { key: '30', label: '30 days' },
            { key: '90', label: '90 days' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setRange(opt.key)}
            className={`flex-1 py-1.5 px-3 rounded-full font-label-md text-label-md transition-all text-center ${
              range === opt.key
                ? 'bg-primary-container text-header-text font-semibold shadow-sm'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 1. Calories Line Chart Card */}
      <div className="bg-card-background rounded-2xl p-space-md flex flex-col space-y-3 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-body-sm text-body-sm text-ink-secondary block">Daily energy</span>
            <div className="font-numeral-hero text-numeral-hero text-ink-primary tracking-tight mt-0.5 font-bold">
              {progress.avgKcal.toLocaleString()}{' '}
              <span className="font-title-sm text-title-sm text-ink-secondary font-normal">kcal avg</span>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-status-safe font-label-sm text-label-sm font-semibold">
            <Icon name="check_circle" size={14} />
            <span>
              {progress.targetMetCount} of {chartDays.length} on target
            </span>
          </div>
        </div>

        {/* Calories SVG Line Chart */}
        <div className="w-full pt-2">
          <svg
            className="w-full h-40 overflow-visible"
            fill="none"
            viewBox="0 0 320 140"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Target Line */}
            <line stroke="#55635a" strokeDasharray="3 3" strokeOpacity="0.45" strokeWidth="1.2" x1="20" x2="310" y1={targetY} y2={targetY} />
            <text fill="#55635a" fontFamily="Inter" fontSize="9" textAnchor="start" x="312" y={targetY + 3}>
              {Math.round(progress.targetKcal / 1000)}k
            </text>

            {/* Average Line */}
            <line stroke="#55635a" strokeDasharray="1 2" strokeOpacity="0.3" strokeWidth="1" x1="20" x2="310" y1={avgY} y2={avgY} />

            {/* Line Chart Path */}
            <path
              d={pathD}
              fill="none"
              stroke="#7b2cff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.75"
            />

            {/* Data points */}
            {points.map((p, idx) => {
              const exceeded = p.day.calories > progress.targetKcal;
              return (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} fill={exceeded ? '#c83939' : '#2d7a48'} r={4.5} />
                  {exceeded && (
                    <circle cx={p.x} cy={p.y} fill="none" r={7.5} stroke="#c83939" strokeOpacity="0.4" strokeWidth="1" />
                  )}
                  {/* Day label */}
                  <text
                    fill="#1a2620"
                    fontFamily="Inter"
                    fontSize="11"
                    fontWeight={idx % 2 === 0 ? '600' : '400'}
                    textAnchor="middle"
                    x={p.x}
                    y={116}
                  >
                    {p.day.dayLabel}
                  </text>
                  {/* Kcal below day label */}
                  <text
                    fill={exceeded ? '#c83939' : '#55635a'}
                    fontFamily="Inter"
                    fontSize="9"
                    fontWeight={exceeded ? '600' : '400'}
                    textAnchor="middle"
                    x={p.x}
                    y={130}
                  >
                    {p.day.calories > 0 ? `${(p.day.calories / 1000).toFixed(1)}k` : '-'}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between pt-1 border-t border-border-subtle/40 text-ink-secondary font-label-sm text-label-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-safe" />
            <span>Target met (≤{progress.targetKcal})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-danger" />
            <span>Exceeded</span>
          </div>
        </div>
      </div>

      {/* 2. Macronutrient Split Card */}
      <div className="bg-card-background rounded-2xl p-space-md flex flex-col space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-sm text-headline-sm text-ink-primary font-semibold">Macronutrient split</h2>
          <span className="font-label-sm text-label-sm text-ink-secondary">Daily intake</span>
        </div>

        <div className="grid grid-cols-3 gap-2 py-1">
          <div className="bg-page-background/70 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#142a1e]" />
              <span className="font-label-sm text-label-sm text-ink-secondary">Protein</span>
            </div>
            <div className="font-numeral-lg text-numeral-lg text-ink-primary leading-tight font-bold">{progress.avgP}g</div>
            <span className="font-body-sm text-body-sm text-ink-secondary">avg / day</span>
          </div>
          <div className="bg-page-background/70 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#2d5a3e]" />
              <span className="font-label-sm text-label-sm text-ink-secondary">Carbs</span>
            </div>
            <div className="font-numeral-lg text-numeral-lg text-ink-primary leading-tight font-bold">{progress.avgC}g</div>
            <span className="font-body-sm text-body-sm text-ink-secondary">avg / day</span>
          </div>
          <div className="bg-page-background/70 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#5a7d65]" />
              <span className="font-label-sm text-label-sm text-ink-secondary">Fat</span>
            </div>
            <div className="font-numeral-lg text-numeral-lg text-ink-primary leading-tight font-bold">{progress.avgF}g</div>
            <span className="font-body-sm text-body-sm text-ink-secondary">avg / day</span>
          </div>
        </div>

        {/* Stacked Daily Bars */}
        <div className="pt-2">
          <div className="flex items-end justify-between h-36 px-2">
            {chartDays.map((bar, i) => {
              const totalMacros = (bar.protein * 4) + (bar.carbs * 4) + (bar.fat * 9) || 1;
              const pPct = Math.round(((bar.protein * 4) / totalMacros) * 100) || 28;
              const cPct = Math.round(((bar.carbs * 4) / totalMacros) * 100) || 48;
              const fPct = Math.round(((bar.fat * 9) / totalMacros) * 100) || 24;

              return (
                <div key={i} className="flex flex-col items-center gap-1.5 w-7">
                  <div className="w-full flex flex-col justify-end h-28 rounded-md overflow-hidden bg-border-subtle/25">
                    <div className="w-full bg-[#5a7d65]" style={{ height: `${fPct}%` }} />
                    <div className="w-full bg-[#2d5a3e]" style={{ height: `${cPct}%` }} />
                    <div className="w-full bg-[#142a1e]" style={{ height: `${pPct}%` }} />
                  </div>
                  <span className="font-label-sm text-label-sm text-ink-secondary font-medium">
                    {bar.dayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Micronutrient Consistency Heatmap Card */}
      <div className="bg-card-background rounded-2xl p-space-md flex flex-col space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-ink-primary font-semibold">Micronutrient consistency</h2>
            <span className="font-body-sm text-body-sm text-ink-secondary">Target completion by day</span>
          </div>
          <Icon name="tune" size={20} className="text-ink-secondary" />
        </div>

        <div className="w-full overflow-hidden pt-1">
          {/* Days Header */}
          <div className="grid grid-cols-8 gap-1 mb-1.5 text-center items-center">
            <div className="font-label-sm text-label-sm text-ink-secondary text-left pl-1">Nutrient</div>
            {chartDays.map((d, i) => (
              <div key={i} className="font-label-sm text-label-sm text-ink-secondary font-semibold">
                {d.dayLabel}
              </div>
            ))}
          </div>

          {/* Rows */}
          {progress.heatmapRows.map((row) => (
            <div key={row.key} className="grid grid-cols-8 gap-1 mb-1 items-center">
              <div className="font-body-sm text-body-sm text-ink-primary truncate pl-1 font-medium">
                {row.label}
              </div>
              {row.dayPcts.map((pct, i) => {
                const isHatched = pct === 0;
                let bgClass = 'bg-[#7b2cff] text-action-text font-semibold';
                if (pct < 50) bgClass = 'bg-[#7b2cff]/15 text-ink-secondary';
                else if (pct < 80) bgClass = 'bg-[#7b2cff]/35 text-ink-primary font-medium';

                if (isHatched) {
                  return (
                    <div
                      key={i}
                      className="h-6 rounded relative overflow-hidden bg-page-background border border-border-subtle"
                      title="No data"
                    >
                      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <line stroke="#727973" strokeOpacity="0.4" strokeWidth="1.5" x1="0" x2="24" y1="24" y2="0" />
                        <line stroke="#727973" strokeOpacity="0.4" strokeWidth="1.5" x1="10" x2="34" y1="24" y2="0" />
                      </svg>
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className={`h-6 rounded flex items-center justify-center font-label-sm text-[10px] ${bgClass}`}
                    title={`${pct}%`}
                  >
                    {pct >= 80 ? `${pct}%` : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50 text-ink-secondary font-label-sm text-label-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#7b2cff]/15" />
            <span>&lt;50%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#7b2cff]/35" />
            <span>50-79%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#7b2cff]" />
            <span>80%+</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-page-background border border-border-subtle flex items-center justify-center text-[9px]">/</span>
            <span>No data</span>
          </div>
        </div>
      </div>

      {/* 4. Body Weight Trend Card */}
      <div className="bg-card-background rounded-2xl p-space-md flex flex-col space-y-3 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-body-sm text-body-sm text-ink-secondary block">Body weight</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-numeral-hero text-numeral-hero text-ink-primary tracking-tight font-bold">
                {progress.latestWeight}
              </span>
              <span className="font-title-sm text-title-sm text-ink-secondary font-normal">kg</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container text-status-safe font-label-sm text-label-sm ml-1 font-semibold">
                {progress.weightDiff <= 0 ? `${progress.weightDiff} kg this week` : `+${progress.weightDiff} kg`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowWeightInput(!showWeightInput)}
            className="px-3 py-1.5 rounded-xl border border-border-subtle text-ink-primary font-label-md text-label-md hover:bg-page-background transition-colors flex items-center gap-1 font-medium"
          >
            <Icon name="add" size={16} />
            <span>Add</span>
          </button>
        </div>

        {showWeightInput && (
          <div className="flex items-center gap-2 p-2 bg-page-background rounded-xl">
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 68.0"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="flex-1 bg-card-background px-3 py-2 rounded-lg text-sm text-ink-primary outline-none"
            />
            <button
              type="button"
              onClick={handleAddWeight}
              className="bg-primary-container text-header-text px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
            >
              Save weight
            </button>
          </div>
        )}

        {/* Sparkline */}
        <div className="w-full pt-1">
          <svg className="w-full h-16 overflow-visible" fill="none" viewBox="0 0 320 60" xmlns="http://www.w3.org/2000/svg">
            <line stroke="#ded6c4" strokeDasharray="2 3" strokeWidth="1" x1="10" x2="310" y1="30" y2="30" />
            <path d="M 15 15 C 60 16, 90 28, 140 26 C 190 24, 230 42, 305 48" fill="none" stroke="#1f3a2b" strokeLinecap="round" strokeWidth="2.25" />
            <circle cx="15" cy="15" fill="#1f3a2b" r="3" />
            <text fill="#55635a" fontFamily="Inter" fontSize="9" textAnchor="middle" x="15" y="8">68.8</text>
            <circle cx="305" cy="48" fill="#7b2cff" r="4.5" />
            <circle cx="305" cy="48" fill="none" r="7" stroke="#7b2cff" strokeOpacity="0.3" strokeWidth="1" />
            <text fill="#7b2cff" fontFamily="Inter" fontSize="10" fontWeight="600" textAnchor="middle" x="305" y="42">
              {progress.latestWeight}
            </text>
          </svg>
          <div className="flex justify-between px-2 text-ink-secondary font-label-sm text-label-sm mt-1">
            <span>Start</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* 5. Water Tracker Card */}
      <div className="bg-card-background rounded-2xl p-space-md flex flex-col space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="water_drop" size={20} className="text-[#3b82f6]" fill />
            <h3 className="font-title-md text-title-md text-ink-primary font-semibold">Water intake</h3>
          </div>
          <button
            type="button"
            onClick={() => handleAddWater(250)}
            className="px-3 py-1 rounded-xl bg-page-background text-ink-primary text-xs font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-1"
          >
            <Icon name="add" size={14} /> +250 ml glass
          </button>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="font-numeral-lg text-numeral-lg text-ink-primary font-bold">
              {currentWater.toLocaleString()}
            </span>
            <span className="font-body-sm text-body-sm text-ink-secondary">/ {targetWater.toLocaleString()} ml</span>
          </div>
          <span className="font-label-sm text-label-sm text-status-safe font-semibold">
            {Math.round((currentWater / targetWater) * 100)}%
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-page-background overflow-hidden">
          <div
            className="h-full bg-[#3b82f6] rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (currentWater / targetWater) * 100)}%` }}
          />
        </div>
      </div>

      {/* 6. Logging Streak & Adherence Card */}
      <div className="bg-card-background rounded-2xl p-space-md flex flex-col space-y-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-header-panel flex items-center justify-center shrink-0">
            <Icon name="local_fire_department" size={22} className="text-header-text" fill />
          </div>
          <div className="flex-1">
            <div className="font-headline-sm text-headline-sm text-ink-primary font-bold">
              {progress.streak} {progress.streak === 1 ? 'day streak' : 'days in a row'}
            </div>
            <p className="font-body-sm text-body-sm text-ink-secondary mt-0.5 leading-snug">
              Consistent Indian meal logging. 92% logging accuracy this month across rotis, sabzi, and pulses.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-subtle/50">
          <div className="flex flex-col">
            <span className="font-body-sm text-body-sm text-ink-secondary">Target protein hits</span>
            <span className="font-title-sm text-title-sm text-ink-primary mt-0.5 font-bold">
              {progress.targetMetCount} / {chartDays.length} days
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-body-sm text-body-sm text-ink-secondary">Sodium check</span>
            <span className="font-title-sm text-title-sm text-status-safe mt-0.5 font-bold">Within range</span>
          </div>
        </div>

        {/* Share Button */}
        <button
          type="button"
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'CALCal Progress',
                text: `I'm on a ${progress.streak}-day streak with CALCal tracking my Indian meals!`,
              }).catch(() => {});
            }
          }}
          className="w-full py-3.5 px-4 rounded-xl bg-action-primary text-action-text font-title-sm text-title-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all shadow-md font-semibold"
        >
          <Icon name="share" size={18} />
          <span>Share progress summary</span>
        </button>
      </div>
    </div>
  );
}
