import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  PaperOrder,
  PaperPosition,
  PriceAlert,
  TradeHistoryEntry,
  OrderSide,
} from '@/types';

const STORAGE_KEY = 'aurum-terminal-state-v1';

interface PersistState {
  positions: PaperPosition[];
  orders: PaperOrder[];
  history: TradeHistoryEntry[];
  alerts: PriceAlert[];
}

function loadState(): PersistState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistState;
      return {
        positions: parsed.positions || [],
        orders: parsed.orders || [],
        history: parsed.history || [],
        alerts: parsed.alerts || [],
      };
    }
  } catch {
    // ignore
  }
  return { positions: [], orders: [], history: [], alerts: [] };
}

function saveState(state: PersistState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function genId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function useTradingStore(currentPrice: number | null) {
  const [state, setState] = useState<PersistState>(loadState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const currentPriceRef = useRef(currentPrice);
  currentPriceRef.current = currentPrice;

  // Persist on change
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Update open position P/L when price changes
  const [livePositions, setLivePositions] = useState<PaperPosition[]>(state.positions);
  useEffect(() => {
    if (currentPrice === null) return;
    setLivePositions(
      state.positions.map((p) => {
        const pnl =
          p.side === 'buy'
            ? (currentPrice - p.entryPrice) * p.quantity
            : (p.entryPrice - currentPrice) * p.quantity;
        const pnlPercent =
          p.side === 'buy'
            ? ((currentPrice - p.entryPrice) / p.entryPrice) * 100
            : ((p.entryPrice - currentPrice) / p.entryPrice) * 100;
        return {
          ...p,
          currentPrice,
          pnl: Math.round(pnl * 100) / 100,
          pnlPercent: Math.round(pnlPercent * 100) / 100,
        };
      })
    );
  }, [state.positions, currentPrice]);

  // Check alerts on price change
  useEffect(() => {
    if (currentPrice === null) return;
    const alerts = stateRef.current.alerts;
    let changed = false;
    const updated = alerts.map((a) => {
      if (!a.enabled || a.status === 'triggered') return a;
      let triggered = false;
      switch (a.condition) {
        case 'above':
          if (currentPrice >= a.price) triggered = true;
          break;
        case 'below':
          if (currentPrice <= a.price) triggered = true;
          break;
        case 'cross_up':
          if (currentPrice >= a.price) triggered = true;
          break;
        case 'cross_down':
          if (currentPrice <= a.price) triggered = true;
          break;
      }
      if (triggered) {
        changed = true;
        if (a.sound) playAlertSound();
        return {
          ...a,
          status: 'triggered' as const,
          enabled: false,
          triggeredAt: Date.now(),
        };
      }
      return a;
    });
    if (changed) {
      setState((s) => ({ ...s, alerts: updated }));
    }
  }, [currentPrice]);

  const placePaperTrade = useCallback(
    (
      side: OrderSide,
      quantity: number,
      entryPrice: number,
      stopLoss?: number,
      takeProfit?: number
    ) => {
      const position: PaperPosition = {
        id: genId(),
        symbol: 'XAUUSD',
        side,
        quantity,
        entryPrice,
        currentPrice: entryPrice,
        stopLoss,
        takeProfit,
        pnl: 0,
        pnlPercent: 0,
        openedAt: Date.now(),
        status: 'open',
      };
      setState((s) => ({ ...s, positions: [...s.positions, position] }));
    },
    []
  );

  const closePosition = useCallback((id: string, closePrice: number) => {
    setState((s) => {
      const pos = s.positions.find((p) => p.id === id);
      if (!pos) return s;
      const pnl =
        pos.side === 'buy'
          ? (closePrice - pos.entryPrice) * pos.quantity
          : (pos.entryPrice - closePrice) * pos.quantity;
      const pnlPercent =
        pos.side === 'buy'
          ? ((closePrice - pos.entryPrice) / pos.entryPrice) * 100
          : ((pos.entryPrice - closePrice) / pos.entryPrice) * 100;
      const historyEntry: TradeHistoryEntry = {
        id: pos.id,
        symbol: pos.symbol,
        side: pos.side,
        quantity: pos.quantity,
        entryPrice: pos.entryPrice,
        closePrice,
        pnl: Math.round(pnl * 100) / 100,
        pnlPercent: Math.round(pnlPercent * 100) / 100,
        openedAt: pos.openedAt,
        closedAt: Date.now(),
      };
      return {
        positions: s.positions.filter((p) => p.id !== id),
        history: [historyEntry, ...s.history].slice(0, 100),
        orders: s.orders,
        alerts: s.alerts,
      };
    });
  }, []);

  const cancelOrder = useCallback((id: string) => {
    setState((s) => ({ ...s, orders: s.orders.filter((o) => o.id === id) }));
  }, []);

  const addAlert = useCallback(
    (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => {
      const newAlert: PriceAlert = {
        ...alert,
        id: genId(),
        createdAt: Date.now(),
        status: 'active',
      };
      setState((s) => ({ ...s, alerts: [...s.alerts, newAlert] }));
    },
    []
  );

  const toggleAlert = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      alerts: s.alerts.map((a) =>
        a.id === id
          ? {
              ...a,
              enabled: !a.enabled,
              status: !a.enabled ? 'active' : 'disabled',
            }
          : a
      ),
    }));
  }, []);

  const deleteAlert = useCallback((id: string) => {
    setState((s) => ({ ...s, alerts: s.alerts.filter((a) => a.id !== id) }));
  }, []);

  const clearHistory = useCallback(() => {
    setState((s) => ({ ...s, history: [] }));
  }, []);

  return {
    positions: livePositions,
    orders: state.orders,
    history: state.history,
    alerts: state.alerts,
    placePaperTrade,
    closePosition,
    cancelOrder,
    addAlert,
    toggleAlert,
    deleteAlert,
    clearHistory,
  };
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // ignore
  }
}
