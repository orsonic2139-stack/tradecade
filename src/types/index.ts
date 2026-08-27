// Core market data types for XAU/USD trading terminal

export type Timeframe =
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

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Quote {
  bid: number;
  ask: number;
  last: number;
  spread: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  timestamp: number;
}

export type ConnectionStatus = 'live' | 'delayed' | 'demo' | 'disconnected';

export interface MarketStatus {
  status: ConnectionStatus;
  label: string;
  isMarketOpen: boolean;
  sessionName: string;
}

export interface PriceUpdate {
  last: number;
  bid: number;
  ask: number;
  timestamp: number;
}

export type PriceUpdateCallback = (update: PriceUpdate) => void;

export interface MarketDataProvider {
  readonly name: string;
  readonly mode: ConnectionStatus;
  getCurrentQuote(): Promise<Quote | null>;
  getHistoricalCandles(timeframe: Timeframe, count?: number): Promise<Candle[]>;
  subscribeToPriceUpdates(callback: PriceUpdateCallback): void;
  unsubscribe(): void;
  getMarketStatus(): MarketStatus;
}

// Technical indicators
export type IndicatorType =
  | 'sma'
  | 'ema'
  | 'rsi'
  | 'macd'
  | 'bollinger'
  | 'vwap'
  | 'atr'
  | 'stochastic'
  | 'volume';

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  period: number;
  period2?: number;
  period3?: number;
  color: string;
  visible: boolean;
  pane: 'main' | 'separate';
}

export interface IndicatorValue {
  time: number;
  value: number;
}

export interface IndicatorResult {
  config: IndicatorConfig;
  main: IndicatorValue[];
  signal?: IndicatorValue[];
  histogram?: IndicatorValue[];
  upper?: IndicatorValue[];
  lower?: IndicatorValue[];
}

// Paper trading
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'open' | 'closed';
export type OrderType = 'market' | 'limit';

export interface PaperPosition {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl: number;
  pnlPercent: number;
  openedAt: number;
  status: OrderStatus;
  closedAt?: number;
  closePrice?: number;
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  createdAt: number;
}

export interface TradeHistoryEntry {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  closePrice: number;
  pnl: number;
  pnlPercent: number;
  openedAt: number;
  closedAt: number;
}

// Alerts
export type AlertCondition = 'above' | 'below' | 'cross_up' | 'cross_down';
export type AlertStatus = 'active' | 'triggered' | 'disabled';

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: AlertCondition;
  price: number;
  enabled: boolean;
  status: AlertStatus;
  sound: boolean;
  notification: boolean;
  createdAt: number;
  triggeredAt?: number;
  message?: string;
}

// Settings
export type ChartType = 'candles' | 'line' | 'area' | 'bars';

export interface Settings {
  chartType: ChartType;
  showGrid: boolean;
  showCrosshair: boolean;
  autoScale: boolean;
  theme: 'dark';
  defaultQuantity: number;
  defaultStopLoss: number;
  defaultTakeProfit: number;
  provider: string;
}
