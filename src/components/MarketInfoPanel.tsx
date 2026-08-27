import type { Quote } from '@/types';

interface MarketInfoPanelProps {
  quote: Quote | null;
  candles: { close: number }[];
}

function InfoCell({
  label,
  value,
  subValue,
  color,
}: {
  label: string;
  value: string;
  subValue?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs text-txt-faint uppercase tracking-wider">{label}</span>
      <span className={`text-xs font-mono font-medium ${color || 'text-txt-primary'}`}>
        {value}
      </span>
      {subValue && <span className="text-2xs text-txt-muted font-mono">{subValue}</span>}
    </div>
  );
}

function calcPerformance(candles: { close: number }[], days: number, current: number): string {
  if (candles.length === 0) return '—';
  // Approximate: each candle ~1 day for 1D timeframe, but we use available data
  const idx = Math.max(0, candles.length - 1 - days);
  const past = candles[idx]?.close;
  if (!past) return '—';
  const pct = ((current - past) / past) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function MarketInfoPanel({ quote, candles }: MarketInfoPanelProps) {
  if (!quote) {
    return (
      <div className="bg-bg-panel border border-border rounded-md p-3">
        <div className="text-xs text-txt-faint">Loading market data...</div>
      </div>
    );
  }

  const changeColor = quote.change >= 0 ? 'text-bull' : 'text-bear';

  return (
    <div className="bg-bg-panel border border-border rounded-md overflow-hidden">
      <div className="px-3 py-2 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-txt-primary">XAU/USD</span>
          <span className="text-2xs text-txt-muted">Market Info</span>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Price section */}
        <div>
          <div className="text-2xs text-txt-faint uppercase tracking-wider mb-1.5">Price</div>
          <div className="grid grid-cols-2 gap-2">
            <InfoCell label="Last" value={quote.last.toFixed(2)} color={changeColor} />
            <InfoCell label="Spread" value={quote.spread.toFixed(2)} />
            <InfoCell label="Bid" value={quote.bid.toFixed(2)} />
            <InfoCell label="Ask" value={quote.ask.toFixed(2)} />
          </div>
        </div>

        <div className="border-t border-border-subtle" />

        {/* Today's Range */}
        <div>
          <div className="text-2xs text-txt-faint uppercase tracking-wider mb-1.5">
            Today's Range
          </div>
          <div className="grid grid-cols-2 gap-2">
            <InfoCell label="High" value={quote.high.toFixed(2)} color="text-bull" />
            <InfoCell label="Low" value={quote.low.toFixed(2)} color="text-bear" />
          </div>
          {/* Range bar */}
          <div className="mt-2 relative h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-gradient-to-r from-bear/40 via-gold/40 to-bull/40 rounded-full"
              style={{
                left: `${((quote.low - quote.low) / (quote.high - quote.low || 1)) * 100}%`,
                width: '100%',
              }}
            />
            <div
              className="absolute w-1 h-3 -top-0.5 bg-gold rounded-sm"
              style={{
                left: `${((quote.last - quote.low) / (quote.high - quote.low || 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="border-t border-border-subtle" />

        {/* Session */}
        <div>
          <div className="text-2xs text-txt-faint uppercase tracking-wider mb-1.5">Session</div>
          <div className="grid grid-cols-2 gap-2">
            <InfoCell label="Open" value={quote.open.toFixed(2)} />
            <InfoCell label="Prev Close" value={quote.previousClose.toFixed(2)} />
          </div>
        </div>

        <div className="border-t border-border-subtle" />

        {/* Performance */}
        <div>
          <div className="text-2xs text-txt-faint uppercase tracking-wider mb-1.5">
            Performance
          </div>
          <div className="grid grid-cols-3 gap-2">
            <InfoCell
              label="1D"
              value={`${quote.change >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`}
              color={quote.change >= 0 ? 'text-bull' : 'text-bear'}
            />
            <InfoCell
              label="5D"
              value={calcPerformance(candles, 5, quote.last)}
              color={undefined}
            />
            <InfoCell
              label="1M"
              value={calcPerformance(candles, 22, quote.last)}
            />
            <InfoCell
              label="3M"
              value={calcPerformance(candles, 66, quote.last)}
            />
            <InfoCell
              label="6M"
              value={calcPerformance(candles, 132, quote.last)}
            />
            <InfoCell
              label="1Y"
              value={calcPerformance(candles, 252, quote.last)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
