import { useState } from 'react';
import { Plus, X, Eye, EyeOff, Settings2, ChevronDown } from 'lucide-react';
import type { IndicatorConfig, IndicatorType } from '@/types';
import { INDICATOR_LABELS, INDICATOR_DEFAULTS } from '@/services/indicators';

interface IndicatorsPanelProps {
  indicators: IndicatorConfig[];
  onAdd: (type: IndicatorType) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<IndicatorConfig>) => void;
}

const AVAILABLE_INDICATORS: IndicatorType[] = [
  'sma',
  'ema',
  'rsi',
  'macd',
  'bollinger',
  'vwap',
  'atr',
  'stochastic',
  'volume',
];

const COLOR_OPTIONS = [
  '#d4af37',
  '#3b82f6',
  '#22c55e',
  '#ef4444',
  '#a855f7',
  '#06b6d4',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#f97316',
];

export function IndicatorsPanel({
  indicators,
  onAdd,
  onRemove,
  onToggle,
  onUpdate,
}: IndicatorsPanelProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {indicators.map((ind) => {
        const label = INDICATOR_LABELS[ind.type];
        const periodLabel = ind.period > 0 ? ` ${ind.period}` : '';
        return (
          <div
            key={ind.id}
            className={`group flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-all ${
              ind.visible
                ? 'bg-bg-elevated border-border text-txt-secondary'
                : 'bg-bg-panel border-border-subtle text-txt-faint'
            }`}
            style={{ borderLeftColor: ind.color, borderLeftWidth: 2 }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: ind.color }}
            />
            <span className="font-mono">{label}{periodLabel}</span>
            <button
              onClick={() => onToggle(ind.id)}
              className="p-0.5 hover:text-txt-primary transition-colors"
            >
              {ind.visible ? <Eye size={11} /> : <EyeOff size={11} />}
            </button>
            <button
              onClick={() => setEditingId(editingId === ind.id ? null : ind.id)}
              className="p-0.5 hover:text-txt-primary transition-colors"
            >
              <Settings2 size={11} />
            </button>
            <button
              onClick={() => onRemove(ind.id)}
              className="p-0.5 hover:text-bear transition-colors"
            >
              <X size={11} />
            </button>

            {editingId === ind.id && (
              <div className="absolute mt-32 z-50 bg-bg-elevated border border-border rounded-md p-3 shadow-xl fade-in min-w-[200px]">
                <div className="space-y-2">
                  {ind.period !== undefined && ind.type !== 'vwap' && ind.type !== 'volume' && (
                    <div>
                      <label className="text-2xs text-txt-muted block mb-1">
                        Period: {ind.period}
                      </label>
                      <input
                        type="range"
                        min={2}
                        max={200}
                        value={ind.period}
                        onChange={(e) =>
                          onUpdate(ind.id, { period: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                    </div>
                  )}
                  {ind.period2 !== undefined && (
                    <div>
                      <label className="text-2xs text-txt-muted block mb-1">
                        Period 2: {ind.period2}
                      </label>
                      <input
                        type="range"
                        min={2}
                        max={100}
                        value={ind.period2}
                        onChange={(e) =>
                          onUpdate(ind.id, { period2: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                    </div>
                  )}
                  {ind.period3 !== undefined && (
                    <div>
                      <label className="text-2xs text-txt-muted block mb-1">
                        Period 3: {ind.period3}
                      </label>
                      <input
                        type="range"
                        min={2}
                        max={50}
                        value={ind.period3}
                        onChange={(e) =>
                          onUpdate(ind.id, { period3: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-2xs text-txt-muted block mb-1">Color</label>
                    <div className="flex items-center gap-1 flex-wrap">
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c}
                          onClick={() => onUpdate(ind.id, { color: c })}
                          className={`w-4 h-4 rounded border ${
                            ind.color === c ? 'border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-border text-txt-secondary hover:bg-bg-hover transition-colors"
        >
          <Plus size={12} /> Indicators
          <ChevronDown size={10} />
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute top-full mt-1 left-0 w-44 bg-bg-elevated border border-border rounded-md shadow-xl z-50 fade-in">
              <div className="px-2 py-1.5 text-2xs text-txt-muted uppercase tracking-wider border-b border-border">
                Technical Indicators
              </div>
              {AVAILABLE_INDICATORS.map((type) => {
                const defaults = INDICATOR_DEFAULTS[type];
                return (
                  <button
                    key={type}
                    onClick={() => {
                      onAdd(type);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-left text-xs text-txt-secondary hover:bg-bg-hover transition-colors"
                  >
                    <span>{INDICATOR_LABELS[type]}</span>
                    <span className="text-2xs text-txt-faint">
                      {defaults.period > 0 ? `(${defaults.period})` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
