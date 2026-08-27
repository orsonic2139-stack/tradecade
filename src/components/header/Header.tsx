import { useState } from 'react';
import {
  Settings,
  Maximize2,
  Minimize2,
  Moon,
  User,
  ChevronDown,
  Activity,
  Bell,
  BarChart3,
} from 'lucide-react';
import type { ConnectionStatus, MarketStatus, Quote } from '@/types';

interface HeaderProps {
  quote: Quote | null;
  status: ConnectionStatus;
  marketStatus: MarketStatus;
  priceDirection: 'up' | 'down' | null;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onOpenAlerts: () => void;
  alertCount: number;
}

function StatusBadge({ status, marketStatus }: { status: ConnectionStatus; marketStatus: MarketStatus }) {
  const config: Record<ConnectionStatus, { label: string; color: string; dot: string; pulse: boolean }> = {
    live: { label: 'LIVE', color: 'text-bull', dot: 'bg-bull', pulse: true },
    delayed: { label: 'DELAYED', color: 'text-warn', dot: 'bg-warn', pulse: false },
    demo: { label: 'DEMO', color: 'text-warn', dot: 'bg-warn', pulse: false },
    disconnected: { label: 'DISCONNECTED', color: 'text-bear', dot: 'bg-bear', pulse: false },
  };
  const c = config[status];

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-bg-elevated border border-border">
      <div className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.pulse ? 'pulse-live' : ''}`} />
      <span className={`text-2xs font-bold tracking-wider ${c.color}`}>{c.label}</span>
      <span className="text-2xs text-txt-faint hidden sm:inline">·</span>
      <span className="text-2xs text-txt-muted hidden sm:inline">{marketStatus.sessionName}</span>
    </div>
  );
}

function PriceDisplay({
  label,
  value,
  direction,
  precision = 2,
}: {
  label: string;
  value: number | null;
  direction?: 'up' | 'down' | null;
  precision?: number;
}) {
  if (value === null || value === undefined) {
    return (
      <div className="flex flex-col items-end">
        <span className="text-2xs text-txt-faint uppercase tracking-wider">{label}</span>
        <span className="text-sm font-mono text-txt-faint">—</span>
      </div>
    );
  }
  const dirClass =
    direction === 'up'
      ? 'text-bull'
      : direction === 'down'
        ? 'text-bear'
        : 'text-txt-primary';

  return (
    <div className="flex flex-col items-end">
      <span className="text-2xs text-txt-faint uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-mono font-medium ${dirClass}`}>
        {value.toFixed(precision)}
      </span>
    </div>
  );
}

export function Header({
  quote,
  status,
  marketStatus,
  priceDirection,
  onOpenSettings,
  onToggleFullscreen,
  isFullscreen,
  onOpenAlerts,
  alertCount,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const changeColor =
    quote && quote.change >= 0 ? 'text-bull' : 'text-bear';
  const changeSign = quote && quote.change >= 0 ? '+' : '';

  return (
    <header className="flex items-center justify-between h-12 px-3 bg-bg-panel border-b border-border no-select relative z-30">
      {/* Left: Logo + nav */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7">
            <svg viewBox="0 0 32 32" className="w-7 h-7">
              <path
                d="M16 5 L24 11 V21 L16 27 L8 21 V11 Z"
                fill="none"
                stroke="#d4af37"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M16 10 L20 13 V18 L16 21 L12 18 V13 Z"
                fill="#d4af37"
                opacity="0.85"
              />
            </svg>
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-sm font-bold text-txt-primary tracking-wide">AURUM</span>
            <span className="text-2xs text-gold tracking-widest">TERMINAL</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 ml-2">
          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gold/10 border border-gold/20 text-gold text-xs font-medium">
            <span className="font-mono">XAUUSD</span>
          </button>
          <button className="px-2.5 py-1 rounded text-txt-muted hover:bg-bg-hover hover:text-txt-secondary text-xs transition-colors flex items-center gap-1.5">
            <BarChart3 size={13} /> Chart
          </button>
          <button
            onClick={onOpenAlerts}
            className="px-2.5 py-1 rounded text-txt-muted hover:bg-bg-hover hover:text-txt-secondary text-xs transition-colors flex items-center gap-1.5 relative"
          >
            <Bell size={13} /> Alerts
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gold text-2xs text-bg-base flex items-center justify-center font-bold">
                {alertCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Center: Price ticker */}
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex flex-col items-center">
          <span className="text-2xs text-txt-faint uppercase tracking-wider">XAU/USD</span>
          <span className="text-2xs text-txt-muted hidden sm:inline">Gold / US Dollar</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex flex-col items-center">
            <span className="text-2xs text-txt-faint uppercase tracking-wider">Last</span>
            <span
              className={`text-lg font-mono font-bold ${
                priceDirection === 'up'
                  ? 'text-bull'
                  : priceDirection === 'down'
                    ? 'text-bear'
                    : 'text-txt-primary'
              }`}
            >
              {quote ? quote.last.toFixed(2) : '—'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <PriceDisplay label="Bid" value={quote?.bid ?? null} />
            <PriceDisplay label="Ask" value={quote?.ask ?? null} />
            <PriceDisplay label="Spread" value={quote?.spread ?? null} precision={2} />
          </div>

          <div className="flex flex-col items-center">
            <span className="text-2xs text-txt-faint uppercase tracking-wider">Change</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-mono font-medium ${changeColor}`}>
                {quote ? `${changeSign}${quote.change.toFixed(2)}` : '—'}
              </span>
              <span className={`text-xs font-mono ${changeColor}`}>
                {quote ? `(${changeSign}${quote.changePercent.toFixed(2)}%)` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: status + actions */}
      <div className="flex items-center gap-2">
        <div className="hidden lg:block">
          <StatusBadge status={status} marketStatus={marketStatus} />
        </div>
        <div className="lg:hidden">
          <StatusBadge status={status} marketStatus={marketStatus} />
        </div>

        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded text-txt-muted hover:bg-bg-hover hover:text-txt-secondary transition-colors tooltip-wrapper"
          >
            <Settings size={16} strokeWidth={1.75} />
            <span className="tooltip-content">Settings</span>
          </button>
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded text-txt-muted hover:bg-bg-hover hover:text-txt-secondary transition-colors tooltip-wrapper"
          >
            {isFullscreen ? <Minimize2 size={16} strokeWidth={1.75} /> : <Maximize2 size={16} strokeWidth={1.75} />}
            <span className="tooltip-content">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
          <button className="p-1.5 rounded text-txt-muted hover:bg-bg-hover hover:text-txt-secondary transition-colors tooltip-wrapper hidden sm:block">
            <Moon size={16} strokeWidth={1.75} />
            <span className="tooltip-content">Dark Theme</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded text-txt-muted hover:bg-bg-hover hover:text-txt-secondary transition-colors"
            >
              <User size={16} strokeWidth={1.75} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-bg-elevated border border-border rounded-md shadow-xl z-50 fade-in">
                  <div className="px-3 py-2 border-b border-border">
                    <span className="text-xs text-txt-muted">Paper Trading Account</span>
                    <div className="text-sm font-medium text-txt-primary">Demo Trader</div>
                  </div>
                  <button className="w-full px-3 py-2 text-left text-xs text-txt-secondary hover:bg-bg-hover transition-colors">
                    Profile
                  </button>
                  <button className="w-full px-3 py-2 text-left text-xs text-txt-secondary hover:bg-bg-hover transition-colors">
                    Reset Paper Account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
