import type {
  Candle,
  ConnectionStatus,
  MarketDataProvider,
  MarketStatus,
  PriceUpdate,
  PriceUpdateCallback,
  Quote,
  Timeframe,
} from '@/types';

// Timeframe to seconds mapping
export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1H': 3600,
  '2H': 7200,
  '4H': 14400,
  '1D': 86400,
  '1W': 604800,
  '1M': 2592000,
};

// Current gold price baseline (updated periodically to stay realistic)
const BASE_PRICE = 2485.0;
const SPREAD_DEFAULT = 0.35;

// Deterministic-ish PRNG with seed for reproducible demo candles
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate realistic OHLC candles using geometric brownian motion + volatility clustering
function generateHistoricalCandles(
  timeframe: Timeframe,
  count: number
): Candle[] {
  const interval = TIMEFRAME_SECONDS[timeframe];
  const now = Math.floor(Date.now() / 1000);
  // Align to interval boundary
  const startTime = Math.floor(now / interval) * interval - (count - 1) * interval;

  const seed = Math.floor(Date.now() / (1000 * 60 * 30)); // changes every 30 min
  const rng = mulberry32(seed + interval);

  const candles: Candle[] = [];
  let price = BASE_PRICE - 120; // start lower so we trend upward over time

  // Volatility per timeframe (in price units)
  const baseVolatility: Record<Timeframe, number> = {
    '1m': 0.4,
    '3m': 0.7,
    '5m': 0.9,
    '15m': 1.5,
    '30m': 2.2,
    '1H': 3.0,
    '2H': 4.5,
    '4H': 6.5,
    '1D': 14,
    '1W': 30,
    '1M': 60,
  };

  const vol = baseVolatility[timeframe] || 1.0;
  let trendBias = 0.0002; // slight upward bias
  let volMultiplier = 1.0;

  for (let i = 0; i < count; i++) {
    // Occasionally shift trend and volatility regime
    if (i % 50 === 0) {
      trendBias = (rng() - 0.45) * 0.0008;
      volMultiplier = 0.7 + rng() * 0.8;
    }

    const open = price;
    const drift = trendBias * price;
    const shock = (rng() - 0.5) * 2 * vol * volMultiplier;
    const close = Math.max(50, open + drift + shock);

    const wickUp = rng() * vol * volMultiplier * 0.8;
    const wickDown = rng() * vol * volMultiplier * 0.8;
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;

    const volume = Math.floor(50000 + rng() * 200000);

    candles.push({
      time: startTime + i * interval,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      volume,
    });

    price = close;
  }

  return candles;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Live price simulation — uses a random walk with occasional small jumps
class DemoPriceEngine {
  private currentPrice: number;
  private previousClose: number;
  private dayOpen: number;
  private dayHigh: number;
  private dayLow: number;
  private interval: ReturnType<typeof setInterval> | null = null;
  private subscribers: Set<PriceUpdateCallback> = new Set();
  private rng: () => number;

  constructor() {
    const candles = generateHistoricalCandles('1m', 500);
    this.currentPrice = candles[candles.length - 1].close;
    this.previousClose = candles[0].open;
    this.dayOpen = candles[Math.max(0, candles.length - 390)].open; // ~1 day of 1m candles
    this.dayHigh = Math.max(...candles.slice(-390).map((c) => c.high));
    this.dayLow = Math.min(...candles.slice(-390).map((c) => c.low));
    this.rng = mulberry32(Date.now());
  }

  getPrice() {
    return this.currentPrice;
  }

  getQuote(): Quote {
    const spread = SPREAD_DEFAULT + (this.rng() - 0.5) * 0.1;
    const bid = round2(this.currentPrice - spread / 2);
    const ask = round2(this.currentPrice + spread / 2);
    const change = round2(this.currentPrice - this.previousClose);
    const changePercent = round2((change / this.previousClose) * 100);
    return {
      bid,
      ask,
      last: round2(this.currentPrice),
      spread: round2(spread),
      change,
      changePercent,
      open: round2(this.dayOpen),
      high: round2(this.dayHigh),
      low: round2(this.dayLow),
      previousClose: round2(this.previousClose),
      timestamp: Date.now(),
    };
  }

  start() {
    if (this.interval) return;
    // Update price every 1-2 seconds with small random walk
    this.interval = setInterval(() => {
      const shock = (this.rng() - 0.5) * 0.6;
      const drift = (BASE_PRICE - this.currentPrice) * 0.001; // mean reversion
      this.currentPrice = Math.max(50, this.currentPrice + shock + drift);
      this.currentPrice = round2(this.currentPrice);

      if (this.currentPrice > this.dayHigh) this.dayHigh = this.currentPrice;
      if (this.currentPrice < this.dayLow) this.dayLow = this.currentPrice;

      const spread = SPREAD_DEFAULT + (this.rng() - 0.5) * 0.1;
      const update: PriceUpdate = {
        last: this.currentPrice,
        bid: round2(this.currentPrice - spread / 2),
        ask: round2(this.currentPrice + spread / 2),
        timestamp: Date.now(),
      };

      this.subscribers.forEach((cb) => cb(update));
    }, 1500);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  subscribe(cb: PriceUpdateCallback) {
    this.subscribers.add(cb);
    this.start();
  }

  unsubscribe(cb: PriceUpdateCallback) {
    this.subscribers.delete(cb);
    if (this.subscribers.size === 0) this.stop();
  }
}

let demoEngine: DemoPriceEngine | null = null;

function getDemoEngine(): DemoPriceEngine {
  if (!demoEngine) demoEngine = new DemoPriceEngine();
  return demoEngine;
}

// Demo data provider — clearly labeled, never claims to be live
export class DemoDataProvider implements MarketDataProvider {
  readonly name = 'Demo Data (Simulated)';
  readonly mode: ConnectionStatus = 'demo';
  private callback: PriceUpdateCallback | null = null;

  async getCurrentQuote(): Promise<Quote | null> {
    return getDemoEngine().getQuote();
  }

  async getHistoricalCandles(timeframe: Timeframe, count = 500): Promise<Candle[]> {
    return generateHistoricalCandles(timeframe, count);
  }

  subscribeToPriceUpdates(callback: PriceUpdateCallback): void {
    this.callback = callback;
    getDemoEngine().subscribe(callback);
  }

  unsubscribe(): void {
    if (this.callback) {
      getDemoEngine().unsubscribe(this.callback);
      this.callback = null;
    }
  }

  getMarketStatus(): MarketStatus {
    return {
      status: 'demo',
      label: 'DEMO',
      isMarketOpen: true,
      sessionName: 'Simulated Session',
    };
  }
}

// Live provider stub — uses Finnhub-style API via server route if key is configured.
// In this environment no server-side key is available, so it falls back to demo.
export class LiveDataProvider implements MarketDataProvider {
  readonly name: string;
  readonly mode: ConnectionStatus;
  private apiKey: string | undefined;
  private callback: PriceUpdateCallback | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(providerName: string, apiKey?: string) {
    this.name = providerName;
    this.apiKey = apiKey;
    this.mode = apiKey ? 'live' : 'disconnected';
  }

  async getCurrentQuote(): Promise<Quote | null> {
    if (!this.apiKey) return null;
    // In a real deployment, this would call a server route that uses the private key.
    return null;
  }

  async getHistoricalCandles(_timeframe: Timeframe, _count = 500): Promise<Candle[]> {
    return [];
  }

  subscribeToPriceUpdates(callback: PriceUpdateCallback): void {
    this.callback = callback;
    // Real implementation would open a WebSocket or poll here.
  }

  unsubscribe(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = null;
    this.callback = null;
  }

  getMarketStatus(): MarketStatus {
    if (!this.apiKey) {
      return {
        status: 'disconnected',
        label: 'DISCONNECTED',
        isMarketOpen: false,
        sessionName: 'No API Key',
      };
    }
    return {
      status: 'live',
      label: 'LIVE',
      isMarketOpen: true,
      sessionName: 'Live Session',
    };
  }
}

// Factory — checks for API key, falls back to demo
export function createMarketDataProvider(): MarketDataProvider {
  // Check for browser-safe VITE_ key (would need a server route for private keys)
  const apiKey = import.meta.env.VITE_XAUUSD_API_KEY as string | undefined;

  if (apiKey) {
    return new LiveDataProvider('Live Data Provider', apiKey);
  }

  // No key configured — use clearly-labeled demo data
  return new DemoDataProvider();
}

// Determine if market is typically open (gold trades nearly 24/5)
export function getGoldMarketSession(): { isOpen: boolean; session: string } {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const utcHour = now.getUTCHours();

  // Closed Saturday大部分 of day and Sunday
  if (utcDay === 6) return { isOpen: false, session: 'Closed (Weekend)' };
  if (utcDay === 0 && utcHour < 22) return { isOpen: false, session: 'Closed (Weekend)' };

  // Sessions (UTC)
  // Sydney: 22-07, Tokyo: 00-09, London: 08-17, New York: 13-22
  if (utcHour >= 22 || utcHour < 7) {
    return { isOpen: true, session: 'Sydney Session' };
  }
  if (utcHour >= 0 && utcHour < 9) {
    return { isOpen: true, session: 'Tokyo Session' };
  }
  if (utcHour >= 8 && utcHour < 17) {
    return { isOpen: true, session: 'London Session' };
  }
  if (utcHour >= 13 && utcHour < 22) {
    return { isOpen: true, session: 'New York Session' };
  }
  return { isOpen: true, session: 'Inter-Session' };
}
