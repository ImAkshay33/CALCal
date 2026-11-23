import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { useProgressData, type RangeDays } from '@/hooks/use-progress';
import { addWeightLog, getAllFoodLogs, getWeightLogs } from '@/data/food-logs';
import { updateProfile } from '@/data/profile';
import { updateWaterLog } from '@/data/water-logs';
import { getLocalDate, getMagnitudeStatus, formatDateDisplay } from '@/lib/utils';
import type { FoodLog } from '@/types/database';

export function ProgressPage() {
  const [range, setRange] = useState<RangeDays>('7');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: progress, isLoading } = useProgressData(range);

  // Queries for All-Days Calendar Widget
  const { data: allLogs = [] } = useQuery<FoodLog[]>({
    queryKey: ['all-food-logs'],
    queryFn: getAllFoodLogs,
    staleTime: 10_000,
  });

  const { data: allWeights = [] } = useQuery({
    queryKey: ['all-weight-logs'],
    queryFn: getWeightLogs,
    staleTime: 10_000,
  });

  // Calendar State
  const todayStr = getLocalDate();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const [y, m] = todayStr.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  // Weight and Water State
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [waterMl, setWaterMl] = useState<number | null>(null);

  const currentWater = waterMl !== null ? waterMl : (progress?.waterToday ?? 0);
  const targetWater = 4000; // Updated target 4000 ml

  // Group all historical food logs by date
  const logsByDate = useMemo(() => {
    const map = new Map<
      string,
      {
        totalKcal: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
        logs: FoodLog[];
      }
    >();

    for (const log of allLogs) {
      const d = log.log_date;
      if (!map.has(d)) {
        map.set(d, { totalKcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, logs: [] });
      }
      const item = map.get(d)!;
      item.totalKcal += Number(log.energy_kcal) || 0;
      item.protein += Number(log.protein_g) || 0;
      item.carbs += Number(log.carbs_g) || 0;
      item.fat += Number(log.fat_g) || 0;
      item.fiber += Number(log.fiber_g) || 0;
      item.logs.push(log);
    }
    return map;
  }, [allLogs]);

  // Group all weights by date
  const weightsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of allWeights) {
      map.set(w.log_date, Number(w.weight_kg));
    }
    return map;
  }, [allWeights]);

  // Calendar calculations
  const calYear = calendarMonth.getFullYear();
  const calMonthIdx = calendarMonth.getMonth();
  const daysInMonth = new Date(calYear, calMonthIdx + 1, 0).getDate();
  const firstDayOfWeek = (new Date(calYear, calMonthIdx, 1).getDay() + 6) % 7; // Monday = 0

  const monthLabel = calendarMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const nextMonth = () => {
    setCalendarMonth(new Date(calYear, calMonthIdx + 1, 1));
  };

  const prevMonth = () => {
    setCalendarMonth(new Date(calYear, calMonthIdx - 1, 1));
  };

  const jumpToToday = () => {
    const [y, m] = todayStr.split('-').map(Number);
    setCalendarMonth(new Date(y, m - 1, 1));
    setSelectedDate(todayStr);
  };

  const handleAddWeight = async () => {
    const val = parseFloat(newWeight);
    if (!isNaN(val) && val > 30 && val < 250) {
      await Promise.all([
        addWeightLog(val, todayStr),
        updateProfile({ current_weight_kg: val }),
      ]);
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['weight-logs'] });
      queryClient.invalidateQueries({ queryKey: ['all-weight-logs'] });
      setShowWeightInput(false);
      setNewWeight('');
    }
  };

  const handleAddWater = async (increment = 250) => {
    const next = currentWater + increment;
    setWaterMl(next);
    await updateWaterLog(todayStr, next);
    queryClient.invalidateQueries({ queryKey: ['progress'] });
  };

  if (isLoading || !progress) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-ink-secondary font-body-md animate-pulse">
        Loading progress metrics...
      </div>
    );
  }

  // Selected Day Details
  const selectedDayData = logsByDate.get(selectedDate);
  const selectedDayWeight = weightsByDate.get(selectedDate);
  const targetKcal = progress.targetKcal ?? 2000;
  const dayCalStatus = selectedDayData
    ? getMagnitudeStatus(selectedDayData.totalKcal, targetKcal)
    : null;

  // Chart math
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
      <div className="bg-card-background rounded-2xl p-space-md flex flex-col space-y-3 shadow-sm hover-raise stroke-sheen transition-all">
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
      <div className="bg-card-background rounded-2xl p-space-md flex flex-col space-y-3 shadow-sm hover-raise stroke-sheen transition-all">
        <div className="flex items-center justify-between">
          <h2 className="font-headline-sm text-headline-sm text-ink-primary font-semibold">Macronutrient split</h2>
          <span className="font-label-sm text-label-sm text-ink-secondary">Daily intake</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 py-1">
          <div className="bg-page-background/70 rounded-xl p-2">
            <div className="flex items-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-sm bg-[#142a1e]" />
              <span className="font-label-sm text-label-sm text-ink-secondary">Protein</span>
            </div>
            <div className="font-numeral-lg text-numeral-lg text-ink-primary leading-tight font-bold">{progress.avgP}g</div>
            <span className="font-body-sm text-[11px] text-ink-secondary">avg / day</span>
          </div>
          <div className="bg-page-background/70 rounded-xl p-2">
            <div className="flex items-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-sm bg-[#2d5a3e]" />
              <span className="font-label-sm text-label-sm text-ink-secondary">Carbs</span>
            </div>
            <div className="font-numeral-lg text-numeral-lg text-ink-primary leading-tight font-bold">{progress.avgC}g</div>
            <span className="font-body-sm text-[11px] text-ink-secondary">avg / day</span>
          </div>
          <div className="bg-page-background/70 rounded-xl p-2">
            <div className="flex items-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-sm bg-[#5a7d65]" />
              <span className="font-label-sm text-label-sm text-ink-secondary">Fat</span>
            </div>
            <div className="font-numeral-lg text-numeral-lg text-ink-primary leading-tight font-bold">{progress.avgF}g</div>
            <span className="font-body-sm text-[11px] text-ink-secondary">avg / day</span>
          </div>
          <div className="bg-page-background/70 rounded-xl p-2">
            <div className="flex items-center gap-1 mb-1">
              <span className="w-2 h-2 rounded-sm bg-[#86a490]" />
              <span className="font-label-sm text-label-sm text-ink-secondary">Fiber</span>
            </div>
            <div className="font-numeral-lg text-numeral-lg text-ink-primary leading-tight font-bold">{(progress as any).avgFiber ?? 30}g</div>
            <span className="font-body-sm text-[11px] text-ink-secondary">avg / day</span>
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

      {/* 3. All-Days Interactive Calendar Widget (UImaxxing Powered) */}
      <div className="bg-card-background rounded-2xl p-space-md flex flex-col space-y-3.5 shadow-sm hover-raise stroke-sheen transition-all">
        {/* Calendar Navigation Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-ink-primary font-semibold">History calendar</h2>
            <p className="font-body-sm text-body-sm text-ink-secondary">
              Inspect logs, calories, and macros across any day
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="w-8 h-8 rounded-full bg-page-background hover:bg-surface-container-high flex items-center justify-center text-ink-primary transition-all active:scale-95 hover-nudge"
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <span className="font-title-sm text-title-sm text-ink-primary font-semibold min-w-32 text-center">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="w-8 h-8 rounded-full bg-page-background hover:bg-surface-container-high flex items-center justify-center text-ink-primary transition-all active:scale-95 hover-nudge"
            >
              <Icon name="chevron_right" size={18} />
            </button>
            <button
              type="button"
              onClick={jumpToToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary-container text-header-text ml-1 hover:opacity-90 active:scale-95 transition-all shadow-xs"
            >
              Today
            </button>
          </div>
        </div>

        {/* Days of Week Row */}
        <div className="grid grid-cols-7 gap-1 text-center font-label-sm text-label-sm text-ink-secondary font-medium pt-1 border-b border-border-subtle/40 pb-1.5">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1 pt-1">
          {/* Empty cells for leading offset */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 rounded-xl bg-transparent" />
          ))}

          {/* Days of the Month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayStr = `${calYear}-${String(calMonthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isToday = dayStr === todayStr;
            const isSelected = dayStr === selectedDate;
            const dayData = logsByDate.get(dayStr);
            const hasLogs = dayData && dayData.totalKcal > 0;
            const dayWeight = weightsByDate.get(dayStr);

            let statusColor = 'bg-status-safe';
            if (hasLogs) {
              const st = getMagnitudeStatus(dayData.totalKcal, targetKcal);
              statusColor = st.barColor;
            }

            return (
              <button
                key={dayStr}
                type="button"
                onClick={() => setSelectedDate(dayStr)}
                className={`h-16 rounded-xl p-1 flex flex-col justify-between text-left transition-all relative hover-raise hover-nudge ${
                  isSelected
                    ? 'ring-2 ring-primary-container bg-surface-container-high shadow-xs'
                    : isToday
                    ? 'bg-page-background border border-primary-container/40'
                    : 'bg-page-background/50 hover:bg-page-background'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-semibold leading-none ${
                      isToday ? 'text-primary-container font-bold' : 'text-ink-primary'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayWeight && (
                    <span className="text-[9px] font-bold text-ink-secondary/80">
                      {dayWeight}k
                    </span>
                  )}
                </div>

                {hasLogs ? (
                  <div className="flex flex-col gap-0.5 mt-auto">
                    <span className="text-[10px] font-bold text-ink-primary leading-tight truncate">
                      {Math.round(dayData.totalKcal).toLocaleString()}
                    </span>
                    <div className="w-full h-1 rounded-full bg-border-subtle overflow-hidden">
                      <div className={`h-full rounded-full ${statusColor}`} style={{ width: '100%' }} />
                    </div>
                  </div>
                ) : (
                  <span className="text-[9px] text-ink-secondary/50 leading-none pb-0.5">-</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day Inspector Card */}
        <div className="mt-2 bg-page-background rounded-2xl p-space-md border border-border-subtle flex flex-col gap-space-sm animate-fade-in stroke-sheen">
          <div className="flex items-start justify-between pb-1 border-b border-border-subtle/50">
            <div>
              <span className="font-label-sm text-label-sm text-ink-secondary">Selected day</span>
              <h3 className="font-headline-sm text-headline-sm text-ink-primary font-bold">
                {formatDateDisplay(selectedDate)}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/?date=${selectedDate}`)}
              className="px-3 py-1.5 rounded-xl bg-header-panel text-header-text font-label-sm text-label-sm font-semibold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-xs"
            >
              <span>View in Today</span>
              <Icon name="arrow_forward" size={16} />
            </button>
          </div>

          {selectedDayData && selectedDayData.totalKcal > 0 ? (
            <div className="flex flex-col gap-3">
              {/* Calories Readout with Magnitude Color */}
              <div className="flex items-baseline justify-between pt-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-numeral-hero text-numeral-hero text-ink-primary font-bold">
                    {Math.round(selectedDayData.totalKcal).toLocaleString()}
                  </span>
                  <span className="font-body-md text-body-md text-ink-secondary">
                    kcal / {targetKcal.toLocaleString()} target
                  </span>
                </div>
                {dayCalStatus && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${dayCalStatus.barColor}`}>
                    {dayCalStatus.pct}% target
                  </span>
                )}
              </div>

              {/* Magnitude Progress Bar */}
              {dayCalStatus && (
                <div className="w-full h-2 rounded-full bg-card-background overflow-hidden p-0.5 border border-border-subtle/40">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${dayCalStatus.barColor}`}
                    style={{ width: `${dayCalStatus.barWidth}%` }}
                  />
                </div>
              )}

              {/* Macronutrient Pills */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="bg-card-background rounded-xl p-2 border border-border-subtle/40">
                  <span className="text-[10px] text-ink-secondary font-medium block">Protein</span>
                  <span className="font-title-sm text-title-sm font-bold text-ink-primary">
                    {Math.round(selectedDayData.protein)}g
                  </span>
                </div>
                <div className="bg-card-background rounded-xl p-2 border border-border-subtle/40">
                  <span className="text-[10px] text-ink-secondary font-medium block">Carbs</span>
                  <span className="font-title-sm text-title-sm font-bold text-ink-primary">
                    {Math.round(selectedDayData.carbs)}g
                  </span>
                </div>
                <div className="bg-card-background rounded-xl p-2 border border-border-subtle/40">
                  <span className="text-[10px] text-ink-secondary font-medium block">Fat</span>
                  <span className="font-title-sm text-title-sm font-bold text-ink-primary">
                    {Math.round(selectedDayData.fat)}g
                  </span>
                </div>
                <div className="bg-card-background rounded-xl p-2 border border-border-subtle/40">
                  <span className="text-[10px] text-ink-secondary font-medium block">Fiber</span>
                  <span className="font-title-sm text-title-sm font-bold text-ink-primary">
                    {Math.round(selectedDayData.fiber)}g
                  </span>
                </div>
              </div>

              {/* Logged Weight if recorded */}
              {selectedDayWeight && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card-background border border-border-subtle/40 text-sm font-medium text-ink-primary">
                  <Icon name="monitor_weight" size={18} className="text-primary-container" />
                  <span>Recorded weight: <strong>{selectedDayWeight} kg</strong></span>
                </div>
              )}

              {/* Logged Dishes on this Day */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="font-label-sm text-label-sm text-ink-secondary">
                  Logged dishes ({selectedDayData.logs.length})
                </span>
                <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-1 scrollbar-none">
                  {selectedDayData.logs.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-card-background border border-border-subtle/30 text-xs row-hover"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-semibold text-ink-primary truncate">
                          {(item as any).custom_food_name || item.label || 'Food item'}
                        </span>
                        <span className="text-ink-secondary text-[10px]">
                          {item.meal ? item.meal.toUpperCase() : 'SNACK'} • {item.grams ?? item.quantity ?? 100}g
                        </span>
                      </div>
                      <span className="font-bold text-ink-primary shrink-0">
                        {Math.round(item.energy_kcal ?? 0)} kcal
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center gap-2 text-ink-secondary">
              <Icon name="calendar_today" size={28} className="opacity-50" />
              <p className="font-body-sm text-body-sm">
                No food logged on {selectedDate === todayStr ? 'today' : selectedDate}
              </p>
              <button
                type="button"
                onClick={() => navigate(`/?date=${selectedDate}`)}
                className="px-4 py-2 rounded-xl bg-action-primary text-action-text font-label-md text-label-md font-semibold hover:opacity-90 active:scale-95 transition-all shadow-xs mt-1"
              >
                Log food for this date
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Body Weight Trend Card (Synced Everywhere) */}
      <div className="bg-card-background rounded-2xl p-space-md flex flex-col space-y-3 shadow-sm hover-raise stroke-sheen transition-all">
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
            className="px-3 py-1.5 rounded-xl border border-border-subtle text-ink-primary font-label-md text-label-md hover:bg-page-background transition-colors flex items-center gap-1 font-medium hover-nudge"
          >
            <Icon name="add" size={16} />
            <span>Add</span>
          </button>
        </div>

        {showWeightInput && (
          <div className="flex flex-col gap-2 p-3 bg-page-background rounded-2xl border border-border-subtle animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-ink-secondary">Record today's weight</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const current = parseFloat(newWeight) || progress.latestWeight;
                    setNewWeight((Math.round((current - 0.5) * 10) / 10).toString());
                  }}
                  className="px-2 py-0.5 rounded bg-card-background text-xs font-semibold text-ink-secondary hover:text-ink-primary transition-colors hover-nudge"
                >
                  -0.5kg
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = parseFloat(newWeight) || progress.latestWeight;
                    setNewWeight((Math.round((current + 0.5) * 10) / 10).toString());
                  }}
                  className="px-2 py-0.5 rounded bg-card-background text-xs font-semibold text-ink-secondary hover:text-ink-primary transition-colors hover-nudge"
                >
                  +0.5kg
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-baseline justify-center gap-1 bg-card-background border border-border-subtle rounded-xl py-2 px-3">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={progress.latestWeight.toString()}
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="w-24 bg-transparent text-center font-numeral-lg text-numeral-lg text-ink-primary font-bold outline-none caret-smooth"
                />
                <span className="font-normal text-ink-secondary text-body-sm">kg</span>
              </div>
              <button
                type="button"
                onClick={handleAddWeight}
                className="bg-primary-container text-header-text px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 shadow-sm active:scale-95 transition-all"
              >
                Log weight
              </button>
            </div>
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

      {/* 5. Water Tracker Card (4000 ml Target, Droplet Emoji Removed) */}
      <div className="bg-card-background rounded-2xl p-space-md flex flex-col space-y-3 shadow-sm hover-raise stroke-sheen transition-all">
        <div className="flex items-center justify-between">
          <h3 className="font-title-md text-title-md text-ink-primary font-semibold">Water intake</h3>
          <button
            type="button"
            onClick={() => handleAddWater(250)}
            className="px-3 py-1 rounded-xl bg-page-background text-ink-primary text-xs font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-1 hover-nudge"
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
    </div>
  );
}
