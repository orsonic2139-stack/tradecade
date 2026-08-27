import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { Quote, OrderSide } from '@/types';

interface OrderPanelProps {
  quote: Quote | null;
  defaultQuantity: number;
  defaultStopLoss: number;
  defaultTakeProfit: number;
  onPlaceTrade: (
    side: OrderSide,
    quantity: number,
    entryPrice: number,
    stopLoss?: number,
    takeProfit?: number
  ) => void;
}

export function OrderPanel({
  quote,
  defaultQuantity,
  defaultStopLoss,
  defaultTakeProfit,
  onPlaceTrade,
}: OrderPanelProps) {
  const [side, setSide] = useState<OrderSide>('buy');
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [useMarket, setUseMarket] = useState(true);

  // Auto-fill entry price with current market price
  useEffect(() => {
    if (useMarket && quote) {
      setEntryPrice(quote.last.toFixed(2));
    }
  }, [quote, useMarket]);

  // Auto-fill SL/TP based on defaults when side changes
  useEffect(() => {
    if (quote && defaultStopLoss > 0) {
      const sl =
        side === 'buy'
          ? quote.last - defaultStopLoss
          : quote.last + defaultStopLoss;
      setStopLoss(sl.toFixed(2));
    }
    if (quote && defaultTakeProfit > 0) {
      const tp =
        side === 'buy'
          ? quote.last + defaultTakeProfit
          : quote.last - defaultTakeProfit;
      setTakeProfit(tp.toFixed(2));
    }
  }, [side, defaultStopLoss, defaultTakeProfit, quote]);

  const entry = parseFloat(entryPrice) || quote?.last || 0;
  const sl = parseFloat(stopLoss) || 0;
  const tp = parseFloat(takeProfit) || 0;

  const risk = sl > 0 && entry > 0 ? Math.abs(entry - sl) : 0;
  const reward = tp > 0 && entry > 0 ? Math.abs(tp - entry) : 0;
  const rr = risk > 0 && reward > 0 ? (reward / risk).toFixed(2) : '—';
  const positionValue = entry * quantity;

  const handlePlace = () => {
    if (!entry) return;
    onPlaceTrade(
      side,
      quantity,
      entry,
      sl > 0 ? sl : undefined,
      tp > 0 ? tp : undefined
    );
  };

  return (
    <div className="bg-bg-panel border border-border rounded-md overflow-hidden">
      <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between">
        <span className="text-xs font-bold text-txt-primary">Paper Trading</span>
        <span className="text-2xs text-warn bg-warn/10 px-1.5 py-0.5 rounded font-medium">
          SIMULATED
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* Buy/Sell toggle */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setSide('buy')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded text-xs font-bold transition-all ${
              side === 'buy'
                ? 'bg-bull/15 text-bull border border-bull/30'
                : 'bg-bg-elevated text-txt-muted border border-border hover:bg-bg-hover'
            }`}
          >
            <TrendingUp size={14} /> BUY
          </button>
          <button
            onClick={() => setSide('sell')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded text-xs font-bold transition-all ${
              side === 'sell'
                ? 'bg-bear/15 text-bear border border-bear/30'
                : 'bg-bg-elevated text-txt-muted border border-border hover:bg-bg-hover'
            }`}
          >
            <TrendingDown size={14} /> SELL
          </button>
        </div>

        {/* Order type */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseMarket(true)}
            className={`px-2 py-1 text-2xs rounded font-medium transition-colors ${
              useMarket
                ? 'bg-bg-elevated text-txt-primary border border-border'
                : 'text-txt-muted hover:text-txt-secondary'
            }`}
          >
            Market
          </button>
          <button
            onClick={() => setUseMarket(false)}
            className={`px-2 py-1 text-2xs rounded font-medium transition-colors ${
              !useMarket
                ? 'bg-bg-elevated text-txt-primary border border-border'
                : 'text-txt-muted hover:text-txt-secondary'
            }`}
          >
            Limit
          </button>
        </div>

        {/* Quantity */}
        <div>
          <label className="text-2xs text-txt-muted block mb-1">Quantity (oz)</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
            step="0.01"
            className="w-full bg-bg-input border border-border rounded px-2 py-1.5 text-xs font-mono text-txt-primary focus:border-gold/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Entry price */}
        <div>
          <label className="text-2xs text-txt-muted block mb-1">
            Entry Price {useMarket && <span className="text-txt-faint">(market)</span>}
          </label>
          <input
            type="number"
            value={entryPrice}
            onChange={(e) => {
              setEntryPrice(e.target.value);
              setUseMarket(false);
            }}
            step="0.01"
            placeholder={quote ? quote.last.toFixed(2) : '0.00'}
            className="w-full bg-bg-input border border-border rounded px-2 py-1.5 text-xs font-mono text-txt-primary focus:border-gold/50 focus:outline-none transition-colors"
          />
        </div>

        {/* SL / TP */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-2xs text-txt-muted block mb-1">Stop Loss</label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              step="0.01"
              placeholder="0.00"
              className="w-full bg-bg-input border border-border rounded px-2 py-1.5 text-xs font-mono text-bear focus:border-bear/50 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-2xs text-txt-muted block mb-1">Take Profit</label>
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              step="0.01"
              placeholder="0.00"
              className="w-full bg-bg-input border border-border rounded px-2 py-1.5 text-xs font-mono text-bull focus:border-bull/50 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Risk/Reward */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-bg-elevated rounded text-2xs">
          <span className="text-txt-muted">Risk/Reward</span>
          <span className="font-mono font-medium text-gold">{rr}</span>
        </div>

        {/* Position value */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-bg-elevated rounded text-2xs">
          <span className="text-txt-muted">Position Value</span>
          <span className="font-mono font-medium text-txt-secondary">
            ${positionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Place order */}
        <button
          onClick={handlePlace}
          className={`w-full py-2.5 rounded text-xs font-bold transition-all ${
            side === 'buy'
              ? 'bg-bull/20 text-bull hover:bg-bull/30 border border-bull/30'
              : 'bg-bear/20 text-bear hover:bg-bear/30 border border-bear/30'
          }`}
        >
          PLACE {side.toUpperCase()} PAPER TRADE
        </button>

        <div className="flex items-start gap-1.5 text-2xs text-txt-faint">
          <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
          <span>
            Paper trading only. No real orders are executed. Simulated for educational purposes.
          </span>
        </div>
      </div>
    </div>
  );
}
