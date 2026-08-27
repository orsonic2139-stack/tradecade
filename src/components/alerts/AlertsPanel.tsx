import { useState } from 'react';
import { Plus, Bell, BellRing, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import type { PriceAlert, AlertCondition, Quote } from '@/types';

interface AlertsPanelProps {
  alerts: PriceAlert[];
  quote: Quote | null;
  onAddAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => void;
  onToggleAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
  onClose: () => void;
}

export function AlertsPanel({
  alerts,
  quote,
  onAddAlert,
  onToggleAlert,
  onDeleteAlert,
  onClose,
}: AlertsPanelProps) {
  const [condition, setCondition] = useState<AlertCondition>('above');
  const [price, setPrice] = useState<string>('');
  const [sound, setSound] = useState(true);
  const [notification, setNotification] = useState(true);

  const handleAdd = () => {
    const p = parseFloat(price);
    if (!p || p <= 0) return;
    onAddAlert({
      symbol: 'XAUUSD',
      condition,
      price: p,
      enabled: true,
      sound,
      notification,
    });
    setPrice('');
  };

  const activeCount = alerts.filter((a) => a.enabled).length;
  const triggeredCount = alerts.filter((a) => a.status === 'triggered').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-bg-panel border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <BellRing size={16} className="text-gold" />
            <span className="text-sm font-bold text-txt-primary">Price Alerts</span>
            <span className="text-2xs text-txt-muted">
              {activeCount} active · {triggeredCount} triggered
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-txt-muted hover:bg-bg-hover hover:text-txt-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Create alert */}
          <div className="space-y-2">
            <div className="text-2xs text-txt-muted uppercase tracking-wider">
              Create Alert for XAU/USD
            </div>
            <div className="flex gap-2">
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as AlertCondition)}
                className="bg-bg-input border border-border rounded px-2 py-1.5 text-xs text-txt-primary focus:border-gold/50 focus:outline-none"
              >
                <option value="above">Price above</option>
                <option value="below">Price below</option>
                <option value="cross_up">Crosses up</option>
                <option value="cross_down">Crosses down</option>
              </select>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                step="0.01"
                placeholder={quote ? quote.last.toFixed(2) : '0.00'}
                className="flex-1 bg-bg-input border border-border rounded px-2 py-1.5 text-xs font-mono text-txt-primary focus:border-gold/50 focus:outline-none"
              />
              <button
                onClick={handleAdd}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-gold/15 text-gold hover:bg-gold/25 border border-gold/30 text-xs font-medium transition-colors"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-2xs text-txt-muted cursor-pointer">
                <button
                  onClick={() => setSound(!sound)}
                  className={`p-1 rounded ${sound ? 'text-gold' : 'text-txt-faint'}`}
                >
                  {sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
                Sound
              </label>
              <label className="flex items-center gap-1.5 text-2xs text-txt-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={notification}
                  onChange={(e) => setNotification(e.target.checked)}
                  className="accent-gold"
                />
                Notification
              </label>
            </div>
          </div>

          <div className="border-t border-border-subtle" />

          {/* Alert list */}
          <div className="space-y-1.5 max-h-64 overflow-auto">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-xs text-txt-faint">
                <Bell size={24} className="mx-auto mb-2 opacity-40" />
                No alerts configured
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between px-3 py-2 rounded border transition-colors ${
                    alert.status === 'triggered'
                      ? 'bg-gold/5 border-gold/20'
                      : alert.enabled
                        ? 'bg-bg-elevated border-border'
                        : 'bg-bg-panel border-border-subtle opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        alert.status === 'triggered'
                          ? 'bg-gold'
                          : alert.enabled
                            ? 'bg-bull pulse-live'
                            : 'bg-txt-faint'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-mono text-txt-primary">
                        {alert.condition === 'above' && '≥'}
                        {alert.condition === 'below' && '≤'}
                        {alert.condition === 'cross_up' && '↗'}
                        {alert.condition === 'cross_down' && '↘'}
                        {' '}
                        {alert.price.toFixed(2)}
                      </div>
                      <div className="text-2xs text-txt-faint">
                        {alert.status === 'triggered'
                          ? `Triggered ${alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleTimeString() : ''}`
                          : alert.enabled
                            ? 'Active'
                            : 'Disabled'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleAlert(alert.id)}
                      disabled={alert.status === 'triggered'}
                      className={`p-1.5 rounded transition-colors disabled:opacity-30 ${
                        alert.enabled
                          ? 'text-bull hover:bg-bull/10'
                          : 'text-txt-muted hover:bg-bg-hover'
                      }`}
                    >
                      {alert.enabled ? <BellRing size={13} /> : <Bell size={13} />}
                    </button>
                    <button
                      onClick={() => onDeleteAlert(alert.id)}
                      className="p-1.5 rounded text-txt-muted hover:bg-bg-hover hover:text-bear transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

