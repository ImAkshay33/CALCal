import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { getMagnitudeStatus } from '@/lib/utils';

interface MicroSummary {
  name: string;
  unit: string;
  current: number;
  target: number;
}

interface MicrosCardProps {
  micros: MicroSummary[];
}

export function MicrosCard({ micros }: MicrosCardProps) {
  const [expanded, setExpanded] = useState(true);

  // Default display items if user has no micro data logged yet
  const items = micros.length > 0 ? micros : [
    { name: 'Iron', unit: 'mg', current: 14, target: 18 },
    { name: 'Calcium', unit: 'mg', current: 620, target: 1000 },
    { name: 'Vitamin C', unit: 'mg', current: 76, target: 80 },
    { name: 'Fiber', unit: 'g', current: 28, target: 35 },
  ];

  const onTrackCount = items.filter((m) => {
    if (m.target <= 0) return true;
    const ratio = m.current / m.target;
    return ratio >= 0.7 && ratio <= 1.2;
  }).length;

  return (
    <section className="bg-card-background rounded-2xl p-space-md flex flex-col gap-space-sm shadow-sm transition-all duration-200 hover-raise stroke-sheen">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left focus:outline-none"
      >
        <div className="flex items-center gap-space-xs">
          <Icon name="nutrition" size={20} className="text-ink-secondary" />
          <h2 className="font-title-sm text-title-sm text-ink-primary font-semibold">Micros today</h2>
        </div>
        <div className="flex items-center gap-space-xs text-ink-secondary">
          <span className="font-label-sm text-label-sm">{onTrackCount} of {items.length} on track</span>
          <Icon
            name={expanded ? 'expand_less' : 'expand_more'}
            size={20}
            className="transition-transform duration-200"
          />
        </div>
      </button>

      {expanded && (
        <div className="grid grid-cols-2 gap-space-sm pt-space-xs">
          {items.map((item) => {
            const status = getMagnitudeStatus(item.current, item.target);

            return (
              <div
                key={item.name}
                className="bg-page-background/70 rounded-xl p-space-sm flex flex-col gap-1 row-hover transition-colors"
              >
                <div className="flex justify-between items-center font-label-sm text-label-sm">
                  <span className="text-ink-secondary truncate pr-1">{item.name}</span>
                  <span className={`font-semibold ${status.textColor}`}>
                    {status.pct}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-card-background rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${status.barColor}`}
                    style={{ width: `${status.barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
