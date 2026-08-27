import { useState } from 'react';
import { X, Sliders, Coins, Database } from 'lucide-react';
import type { Settings as SettingsType, ChartType } from '@/types';

interface SettingsModalProps {
  settings: SettingsType;
  onChange: (updates: Partial<SettingsType>) => void;
  onClose: () => void;
  providerName: string;
  connectionStatus: string;
}

export function SettingsModal({
  settings,
  onChange,
  onClose,
  providerName,
  connectionStatus,
}: SettingsModalProps) {
  const [section, setSection] = useState<'chart' | 'trading' | 'data'>('chart');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-bg-panel border border-border rounded-lg shadow-2xl w-full max-w-lg mx-4 slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-bold text-txt-primary">Settings</span>
          <button
            onClick={onClose}
            className="p-1 rounded text-txt-muted hover:bg-bg-hover hover:text-txt-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-36 border-r border-border-subtle py-2">
            <SettingsTab
              active={section === 'chart'}
              onClick={() => setSection('chart')}
              icon={<Sliders size={14} />}
              label="Chart"
            />
            <SettingsTab
              active={section === 'trading'}
              onClick={() => setSection('trading')}
              icon={<Coins size={14} />}
              label="Trading"
            />
            <SettingsTab
              active={section === 'data'}
              onClick={() => setSection('data')}
              icon={<Database size={14} />}
              label="Data"
            />
          </div>

          {/* Content */}
          <div className="flex-1 p-4 space-y-3">
            {section === 'chart' && (
              <>
                <SettingRow label="Chart Type">
                  <select
                    value={settings.chartType}
                    onChange={(e) => onChange({ chartType: e.target.value as ChartType })}
                    className="bg-bg-input border border-border rounded px-2 py-1 text-xs text-txt-primary focus:border-gold/50 focus:outline-none"
                  >
                    <option value="candles">Candlesticks</option>
                    <option value="bars">OHLC Bars</option>
                    <option value="line">Line</option>
                    <option value="area">Area</option>
                  </select>
                </SettingRow>
                <SettingRow label="Show Grid">
                  <Toggle
                    checked={settings.showGrid}
                    onChange={(v) => onChange({ showGrid: v })}
                  />
                </SettingRow>
                <SettingRow label="Show Crosshair">
                  <Toggle
                    checked={settings.showCrosshair}
                    onChange={(v) => onChange({ showCrosshair: v })}
                  />
                </SettingRow>
                <SettingRow label="Auto Scale">
                  <Toggle
                    checked={settings.autoScale}
                    onChange={(v) => onChange({ autoScale: v })}
                  />
                </SettingRow>
                <SettingRow label="Theme">
                  <span className="text-xs text-txt-muted px-2 py-1 bg-bg-elevated rounded">
                    Dark (only)
                  </span>
                </SettingRow>
              </>
            )}

            {section === 'trading' && (
              <>
                <SettingRow label="Default Quantity (oz)">
                  <input
                    type="number"
                    value={settings.defaultQuantity}
                    onChange={(e) =>
                      onChange({ defaultQuantity: parseFloat(e.target.value) || 0 })
                    }
                    step="0.01"
                    className="w-24 bg-bg-input border border-border rounded px-2 py-1 text-xs font-mono text-txt-primary focus:border-gold/50 focus:outline-none"
                  />
                </SettingRow>
                <SettingRow label="Default Stop Loss ($)">
                  <input
                    type="number"
                    value={settings.defaultStopLoss}
                    onChange={(e) =>
                      onChange({ defaultStopLoss: parseFloat(e.target.value) || 0 })
                    }
                    step="0.1"
                    className="w-24 bg-bg-input border border-border rounded px-2 py-1 text-xs font-mono text-txt-primary focus:border-gold/50 focus:outline-none"
                  />
                </SettingRow>
                <SettingRow label="Default Take Profit ($)">
                  <input
                    type="number"
                    value={settings.defaultTakeProfit}
                    onChange={(e) =>
                      onChange({ defaultTakeProfit: parseFloat(e.target.value) || 0 })
                    }
                    step="0.1"
                    className="w-24 bg-bg-input border border-border rounded px-2 py-1 text-xs font-mono text-txt-primary focus:border-gold/50 focus:outline-none"
                  />
                </SettingRow>
              </>
            )}

            {section === 'data' && (
              <>
                <SettingRow label="Data Provider">
                  <span className="text-xs text-txt-secondary px-2 py-1 bg-bg-elevated rounded">
                    {providerName}
                  </span>
                </SettingRow>
                <SettingRow label="Connection Status">
                  <span
                    className={`text-xs px-2 py-1 rounded font-medium ${
                      connectionStatus === 'live'
                        ? 'text-bull bg-bull/10'
                        : connectionStatus === 'demo'
                          ? 'text-warn bg-warn/10'
                          : 'text-bear bg-bear/10'
                    }`}
                  >
                    {connectionStatus.toUpperCase()}
                  </span>
                </SettingRow>
                <div className="pt-2 border-t border-border-subtle">
                  <p className="text-2xs text-txt-faint leading-relaxed">
                    To use live market data, set the <code className="text-gold font-mono">VITE_XAUUSD_API_KEY</code> environment variable
                    with a valid API key from a supported provider (Twelve Data, Finnhub, Alpha Vantage, or Polygon).
                    Private API keys must be proxied through a server route — never exposed in the browser.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
        active
          ? 'text-gold bg-gold/10 border-r-2 border-gold'
          : 'text-txt-muted hover:text-txt-secondary hover:bg-bg-hover'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-txt-secondary">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors ${
        checked ? 'bg-gold/40' : 'bg-bg-elevated border border-border'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
          checked ? 'left-4 bg-gold' : 'left-0.5 bg-txt-muted'
        }`}
      />
    </button>
  );
}
