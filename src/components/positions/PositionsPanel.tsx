import { useState } from 'react';
import { X, Clock, History, Wallet } from 'lucide-react';
import type { PaperPosition, PaperOrder, TradeHistoryEntry } from '@/types';

interface PositionsPanelProps {
  positions: PaperPosition[];
  orders: PaperOrder[];
  history: TradeHistoryEntry[];
  currentPrice: number | null;
  onClosePosition: (id: string, price: number) => void;
  onCancelOrder: (id: string) => void;
  onClearHistory: () => void;
}

type Tab = 'positions' | 'orders' | 'history';

export function PositionsPanel({
  positions,
  orders,
  history,
  currentPrice,
  onClosePosition,
  onCancelOrder,
  onClearHistory,
}: PositionsPanelProps) {
  const [tab, setTab] = useState<Tab>('positions');

  const openCount = positions.filter((p) => p.status === 'open').length;
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div className="bg-bg-panel border-t border-border flex flex-col" style={{ height: '200px' }}>
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-border-subtle px-2">
        <div className="flex items-center gap-0.5">
          <TabButton
            active={tab === 'positions'}
            onClick={() => setTab('positions')}
            icon={<Wallet size={12} />}
            label="Positions"
            count={openCount}
          />
          <TabButton
            active={tab === 'orders'}
            onClick={() => setTab('orders')}
            icon={<Clock size={12} />}
            label="Orders"
            count={orders.length}
          />
          <TabButton
            active={tab === 'history'}
            onClick={() => setTab('history')}
            icon={<History size={12} />}
            label="History"
            count={history.length}
          />
        </div>

        {tab === 'positions' && openCount > 0 && (
          <div className="flex items-center gap-2 text-2xs">
            <span className="text-txt-muted">Total P/L:</span>
            <span
              className={`font-mono font-medium ${
                totalPnl >= 0 ? 'text-bull' : 'text-bear'
              }`}
            >
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </span>
          </div>
        )}
        {tab === 'history' && history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-2xs text-txt-muted hover:text-bear transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'positions' && (
          <PositionsTable
            positions={positions}
            currentPrice={currentPrice}
            onClose={onClosePosition}
          />
        )}
        {tab === 'orders' && <OrdersTable orders={orders} onCancel={onCancelOrder} />}
        {tab === 'history' && <HistoryTable history={history} />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
        active
          ? 'text-gold border-gold'
          : 'text-txt-muted border-transparent hover:text-txt-secondary'
      }`}
    >
      {icon}
      {label}
      {count > 0 && (
        <span
          className={`px-1 py-0.5 rounded text-2xs font-mono ${
            active ? 'bg-gold/15 text-gold' : 'bg-bg-elevated text-txt-muted'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full text-xs text-txt-faint">
      {message}
    </div>
  );
}

function PositionsTable({
  positions,
  currentPrice,
  onClose,
}: {
  positions: PaperPosition[];
  currentPrice: number | null;
  onClose: (id: string, price: number) => void;
}) {
  if (positions.length === 0) {
    return <EmptyState message="No open positions. Place a paper trade to get started." />;
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-2xs text-txt-faint uppercase tracking-wider border-b border-border-subtle">
          <th className="text-left px-3 py-1.5 font-medium">Symbol</th>
          <th className="text-left px-2 py-1.5 font-medium">Side</th>
          <th className="text-right px-2 py-1.5 font-medium">Qty</th>
          <th className="text-right px-2 py-1.5 font-medium">Entry</th>
          <th className="text-right px-2 py-1.5 font-medium">Current</th>
          <th className="text-right px-2 py-1.5 font-medium">P/L</th>
          <th className="text-right px-2 py-1.5 font-medium hidden sm:table-cell">P/L %</th>
          <th className="text-right px-2 py-1.5 font-medium hidden md:table-cell">SL</th>
          <th className="text-right px-2 py-1.5 font-medium hidden md:table-cell">TP</th>
          <th className="text-center px-2 py-1.5 font-medium">Action</th>
        </tr>
      </thead>
      <tbody>
        {positions.map((pos) => (
          <tr
            key={pos.id}
            className="border-b border-border-subtle hover:bg-bg-elevated/50 transition-colors"
          >
            <td className="px-3 py-1.5 font-mono text-gold">{pos.symbol}</td>
            <td className="px-2 py-1.5">
              <span
                className={`px-1.5 py-0.5 rounded text-2xs font-bold ${
                  pos.side === 'buy'
                    ? 'bg-bull/15 text-bull'
                    : 'bg-bear/15 text-bear'
                }`}
              >
                {pos.side.toUpperCase()}
              </span>
            </td>
            <td className="px-2 py-1.5 text-right font-mono text-txt-secondary">
              {pos.quantity.toFixed(2)}
            </td>
            <td className="px-2 py-1.5 text-right font-mono text-txt-secondary">
              {pos.entryPrice.toFixed(2)}
            </td>
            <td className="px-2 py-1.5 text-right font-mono text-txt-primary">
              {pos.currentPrice.toFixed(2)}
            </td>
            <td
              className={`px-2 py-1.5 text-right font-mono font-medium ${
                pos.pnl >= 0 ? 'text-bull' : 'text-bear'
              }`}
            >
              {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(2)}
            </td>
            <td
              className={`px-2 py-1.5 text-right font-mono hidden sm:table-cell ${
                pos.pnlPercent >= 0 ? 'text-bull' : 'text-bear'
              }`}
            >
              {pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
            </td>
            <td className="px-2 py-1.5 text-right font-mono text-bear hidden md:table-cell">
              {pos.stopLoss ? pos.stopLoss.toFixed(2) : '—'}
            </td>
            <td className="px-2 py-1.5 text-right font-mono text-bull hidden md:table-cell">
              {pos.takeProfit ? pos.takeProfit.toFixed(2) : '—'}
            </td>
            <td className="px-2 py-1.5 text-center">
              <button
                onClick={() => currentPrice && onClose(pos.id, currentPrice)}
                disabled={!currentPrice}
                className="px-2 py-0.5 rounded text-2xs bg-bg-elevated text-txt-secondary hover:bg-bg-hover hover:text-bear border border-border transition-colors disabled:opacity-50"
              >
                Close
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OrdersTable({
  orders,
  onCancel,
}: {
  orders: PaperOrder[];
  onCancel: (id: string) => void;
}) {
  if (orders.length === 0) {
    return <EmptyState message="No pending orders." />;
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-2xs text-txt-faint uppercase tracking-wider border-b border-border-subtle">
          <th className="text-left px-3 py-1.5 font-medium">Symbol</th>
          <th className="text-left px-2 py-1.5 font-medium">Side</th>
          <th className="text-left px-2 py-1.5 font-medium">Type</th>
          <th className="text-right px-2 py-1.5 font-medium">Qty</th>
          <th className="text-right px-2 py-1.5 font-medium">Limit</th>
          <th className="text-center px-2 py-1.5 font-medium">Action</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id} className="border-b border-border-subtle hover:bg-bg-elevated/50">
            <td className="px-3 py-1.5 font-mono text-gold">{order.symbol}</td>
            <td className="px-2 py-1.5">
              <span
                className={`px-1.5 py-0.5 rounded text-2xs font-bold ${
                  order.side === 'buy' ? 'bg-bull/15 text-bull' : 'bg-bear/15 text-bear'
                }`}
              >
                {order.side.toUpperCase()}
              </span>
            </td>
            <td className="px-2 py-1.5 text-txt-muted capitalize">{order.type}</td>
            <td className="px-2 py-1.5 text-right font-mono text-txt-secondary">
              {order.quantity.toFixed(2)}
            </td>
            <td className="px-2 py-1.5 text-right font-mono text-txt-secondary">
              {order.limitPrice?.toFixed(2) || '—'}
            </td>
            <td className="px-2 py-1.5 text-center">
              <button
                onClick={() => onCancel(order.id)}
                className="px-2 py-0.5 rounded text-2xs bg-bg-elevated text-txt-secondary hover:bg-bg-hover hover:text-bear border border-border transition-colors"
              >
                Cancel
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HistoryTable({ history }: { history: TradeHistoryEntry[] }) {
  if (history.length === 0) {
    return <EmptyState message="No trade history yet." />;
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-2xs text-txt-faint uppercase tracking-wider border-b border-border-subtle">
          <th className="text-left px-3 py-1.5 font-medium">Symbol</th>
          <th className="text-left px-2 py-1.5 font-medium">Side</th>
          <th className="text-right px-2 py-1.5 font-medium">Qty</th>
          <th className="text-right px-2 py-1.5 font-medium">Entry</th>
          <th className="text-right px-2 py-1.5 font-medium">Close</th>
          <th className="text-right px-2 py-1.5 font-medium">P/L</th>
          <th className="text-right px-2 py-1.5 font-medium hidden sm:table-cell">P/L %</th>
          <th className="text-right px-2 py-1.5 font-medium hidden md:table-cell">Closed</th>
        </tr>
      </thead>
      <tbody>
        {history.map((h) => (
          <tr key={h.id} className="border-b border-border-subtle hover:bg-bg-elevated/50">
            <td className="px-3 py-1.5 font-mono text-gold">{h.symbol}</td>
            <td className="px-2 py-1.5">
              <span
                className={`px-1.5 py-0.5 rounded text-2xs font-bold ${
                  h.side === 'buy' ? 'bg-bull/15 text-bull' : 'bg-bear/15 text-bear'
                }`}
              >
                {h.side.toUpperCase()}
              </span>
            </td>
            <td className="px-2 py-1.5 text-right font-mono text-txt-secondary">
              {h.quantity.toFixed(2)}
            </td>
            <td className="px-2 py-1.5 text-right font-mono text-txt-secondary">
              {h.entryPrice.toFixed(2)}
            </td>
            <td className="px-2 py-1.5 text-right font-mono text-txt-secondary">
              {h.closePrice.toFixed(2)}
            </td>
            <td
              className={`px-2 py-1.5 text-right font-mono font-medium ${
                h.pnl >= 0 ? 'text-bull' : 'text-bear'
              }`}
            >
              {h.pnl >= 0 ? '+' : ''}{h.pnl.toFixed(2)}
            </td>
            <td
              className={`px-2 py-1.5 text-right font-mono hidden sm:table-cell ${
                h.pnlPercent >= 0 ? 'text-bull' : 'text-bear'
              }`}
            >
              {h.pnlPercent >= 0 ? '+' : ''}{h.pnlPercent.toFixed(2)}%
            </td>
            <td className="px-2 py-1.5 text-right font-mono text-txt-faint hidden md:table-cell">
              {new Date(h.closedAt).toLocaleTimeString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
