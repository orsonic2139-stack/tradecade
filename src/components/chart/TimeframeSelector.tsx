import { useState } from 'react';

export type TimeframeId =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1H'
  | '2H'
  | '4H'
  | '1D'
  | '1W'
  | '1M';

const TIMEFRAMES: { id: TimeframeId; label: string }[] = [
  { id: '1m', label: '1m' },
  { id: '3m', label: '3m' },
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
  { id: '30m', label: '30m' },
  { id: '1H', label: '1H' },
  { id: '2H', label: '2H' },
  { id: '4H', label: '4H' },
  { id: '1D', label: '1D' },
  { id: '1W', label: '1W' },
  { id: '1M', label: '1M' },
];

interface TimeframeSelectorProps {
  active: TimeframeId;
  onChange: (tf: TimeframeId) => void;
}

export function TimeframeSelector({ active, onChange }: TimeframeSelectorProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-0.5 no-select">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.id}
          onClick={() => onChange(tf.id)}
          onMouseEnter={() => setHovered(tf.id)}
          onMouseLeave={() => setHovered(null)}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-all duration-150 font-mono ${
            active === tf.id
              ? 'bg-gold/15 text-gold border border-gold/30'
              : 'text-txt-muted border border-transparent hover:bg-bg-hover hover:text-txt-secondary'
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}
