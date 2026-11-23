import { useState } from 'react';
import { Icon } from '@/components/Icon';

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

  const onTrackCount = items.filter((m) => m.target > 0 && (m.current / m.target) >= 0.7).length;

  return (
    <section className="bg-card-background rounded-2xl p-space-md flex flex-col gap-space-sm shadow-sm transition-all duration-200">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left focus:outline-none"
      >
        <div className="flex items-center gap-space-xs">
          <Icon name="nutrition" size={20} className="text-ink-secondary" />
          <h2 className="font-title-sm text-title-sm text-ink-primary">Micros today</h2>
        </div>
        <div className="flex items-center gap-space-xs text-ink-secondary">
          <span className="font-label-sm text-label-sm">{onTrackCount} on track</span>
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
            const pct = item.target > 0 ? Math.min(100, Math.round((item.current / item.target) * 100)) : 0;
            return (
              <div
                key={item.name}
                className="bg-page-background/70 rounded-xl p-space-sm flex flex-col gap-1"
              >
                <div className="flex justify-between items-center font-label-sm text-label-sm">
                  <span className="text-ink-secondary">{item.name}</span>
                  <span className="font-semibold text-status-safe">{pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-card-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-status-safe rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
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
