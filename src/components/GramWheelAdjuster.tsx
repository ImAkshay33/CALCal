import { Icon } from '@/components/Icon';

interface GramWheelAdjusterProps {
  grams: number;
  onChange: (grams: number) => void;
  min?: number;
  max?: number;
}

const PRESET_PILLS = [
  { label: '50g', desc: 'Chutney / dip', value: 50 },
  { label: '100g', desc: 'Standard', value: 100 },
  { label: '150g', desc: '1 katori', value: 150 },
  { label: '200g', desc: '1 cup / roti pair', value: 200 },
  { label: '250g', desc: '1 bowl / plate', value: 250 },
];

export function GramWheelAdjuster({
  grams,
  onChange,
  min = 10,
  max = 600,
}: GramWheelAdjusterProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value, 10));
  };

  const adjustDelta = (delta: number) => {
    onChange(Math.max(min, Math.min(max, grams + delta)));
  };

  return (
    <div className="bg-card-background rounded-2xl p-space-md border border-border-subtle flex flex-col gap-space-sm shadow-sm select-none hover-raise stroke-sheen transition-all">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-label-sm text-label-sm text-ink-secondary block">Weight portion</span>
          <span className="font-body-sm text-body-sm text-ink-secondary">Slide wheel or tap quick presets</span>
        </div>
        <div className="flex items-baseline gap-1 bg-surface-container-low px-3 py-1 rounded-xl border border-border-subtle">
          <input
            type="number"
            min={min}
            max={max}
            value={grams}
            onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min)))}
            className="font-numeral-hero text-numeral-hero text-primary-container leading-none bg-transparent outline-none w-20 text-right font-bold caret-smooth"
          />
          <span className="font-title-sm text-title-sm text-ink-secondary font-medium">g</span>
        </div>
      </div>

      {/* Stepper Buttons & Wheel Scrubber */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          aria-label="Decrease 10g"
          onClick={() => adjustDelta(-10)}
          className="w-10 h-10 rounded-xl bg-page-background text-ink-primary hover:bg-surface-container-high active:scale-95 transition-all flex items-center justify-center font-title-sm shadow-xs shrink-0 hover-nudge"
        >
          <Icon name="remove" size={20} />
        </button>

        {/* Tactile Range Scrubber */}
        <div className="flex-1 flex flex-col gap-1.5 relative px-1">
          <input
            type="range"
            min={min}
            max={max}
            step="5"
            value={grams}
            onChange={handleSliderChange}
            className="w-full h-2.5 bg-page-background rounded-full appearance-none cursor-pointer accent-[#1f3a2b]"
          />
          {/* Ruler Ticks */}
          <div className="flex justify-between text-[10px] text-ink-secondary px-0.5">
            <span>50g</span>
            <span>150g</span>
            <span>250g</span>
            <span>400g</span>
            <span>600g</span>
          </div>
        </div>

        <button
          type="button"
          aria-label="Increase 10g"
          onClick={() => adjustDelta(10)}
          className="w-10 h-10 rounded-xl bg-page-background text-ink-primary hover:bg-surface-container-high active:scale-95 transition-all flex items-center justify-center font-title-sm shadow-xs shrink-0 hover-nudge"
        >
          <Icon name="add" size={20} />
        </button>
      </div>

      {/* Quick Increment Chips */}
      <div className="flex items-center gap-1.5 pt-1">
        <span className="text-[11px] text-ink-secondary font-medium mr-0.5">Nudge:</span>
        <button
          type="button"
          onClick={() => adjustDelta(-25)}
          className="px-2.5 py-1 rounded-lg bg-page-background hover:bg-surface-container-high text-ink-primary text-xs font-semibold transition-colors hover-nudge"
        >
          -25g
        </button>
        <button
          type="button"
          onClick={() => adjustDelta(25)}
          className="px-2.5 py-1 rounded-lg bg-page-background hover:bg-surface-container-high text-ink-primary text-xs font-semibold transition-colors hover-nudge"
        >
          +25g
        </button>
        <button
          type="button"
          onClick={() => adjustDelta(50)}
          className="px-2.5 py-1 rounded-lg bg-page-background hover:bg-surface-container-high text-ink-primary text-xs font-semibold transition-colors hover-nudge"
        >
          +50g
        </button>
        <button
          type="button"
          onClick={() => adjustDelta(100)}
          className="px-2.5 py-1 rounded-lg bg-page-background hover:bg-surface-container-high text-ink-primary text-xs font-semibold transition-colors hover-nudge"
        >
          +100g
        </button>
      </div>

      {/* Indian Staple Portion Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none scroll-snappy snap-x-list">
        {PRESET_PILLS.map((pill) => (
          <button
            key={pill.value}
            type="button"
            onClick={() => onChange(pill.value)}
            className={`px-3 py-1.5 rounded-xl font-label-sm text-label-sm shrink-0 transition-all text-left flex flex-col snap-item hover-nudge ${
              grams === pill.value
                ? 'bg-header-panel text-header-text font-semibold shadow-xs'
                : 'bg-page-background text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <span className="leading-tight">{pill.label}</span>
            <span className="text-[10px] opacity-75 leading-tight">{pill.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
