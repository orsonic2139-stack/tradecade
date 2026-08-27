interface OHLCLegendProps {
  data: {
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    volume: number;
    time: number;
  } | null;
  timeframe: string;
}

export function OHLCLegend({ data, timeframe }: OHLCLegendProps) {
  if (!data) {
    return (
      <div className="absolute top-2 left-3 z-10 pointer-events-none">
        <div className="flex items-center gap-3 text-2xs font-mono text-txt-faint">
          <span className="text-gold font-medium">XAU/USD</span>
          <span>{timeframe}</span>
        </div>
      </div>
    );
  }

  const isUp = data.change >= 0;
  const color = isUp ? 'text-bull' : 'text-bear';
  const date = new Date(data.time * 1000);
  const timeStr = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="absolute top-2 left-3 z-10 pointer-events-none">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-2xs font-mono">
        <span className="text-gold font-medium">XAU/USD</span>
        <span className="text-txt-faint">{timeframe}</span>
        <span className="text-txt-muted">O: <span className={color}>{data.open.toFixed(2)}</span></span>
        <span className="text-txt-muted">H: <span className={color}>{data.high.toFixed(2)}</span></span>
        <span className="text-txt-muted">L: <span className={color}>{data.low.toFixed(2)}</span></span>
        <span className="text-txt-muted">C: <span className={color}>{data.close.toFixed(2)}</span></span>
        <span className={`${color} font-medium`}>
          {isUp ? '+' : ''}{data.change.toFixed(2)}
        </span>
        <span className="text-txt-faint hidden sm:inline">{timeStr}</span>
      </div>
    </div>
  );
}
