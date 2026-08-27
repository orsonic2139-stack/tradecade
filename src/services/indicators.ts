import type { Candle, IndicatorConfig, IndicatorResult, IndicatorValue } from '@/types';

// Simple Moving Average
export function calculateSMA(candles: Candle[], period: number): IndicatorValue[] {
  const result: IndicatorValue[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    result.push({ time: candles[i].time, value: sum / period });
  }
  return result;
}

// Exponential Moving Average
export function calculateEMA(candles: Candle[], period: number): IndicatorValue[] {
  const result: IndicatorValue[] = [];
  const k = 2 / (period + 1);
  let ema = 0;
  for (let i = 0; i < candles.length; i++) {
    const price = candles[i].close;
    if (i === 0) {
      ema = price;
    } else {
      ema = price * k + ema * (1 - k);
    }
    if (i >= period - 1) {
      result.push({ time: candles[i].time, value: ema });
    }
  }
  return result;
}

// RSI (Relative Strength Index)
export function calculateRSI(candles: Candle[], period: number): IndicatorValue[] {
  const result: IndicatorValue[] = [];
  if (candles.length < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({ time: candles[period].time, value: 100 - 100 / (1 + firstRS) });

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ time: candles[i].time, value: 100 - 100 / (1 + rs) });
  }
  return result;
}

// MACD
export function calculateMACD(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): { main: IndicatorValue[]; signal: IndicatorValue[]; histogram: IndicatorValue[] } {
  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);

  const fastMap = new Map(fastEMA.map((v) => [v.time, v.value]));
  const macdValues: IndicatorValue[] = [];
  for (const sv of slowEMA) {
    const fv = fastMap.get(sv.time);
    if (fv !== undefined) {
      macdValues.push({ time: sv.time, value: fv - sv.value });
    }
  }

  // Signal = EMA of MACD
  const signalValues: IndicatorValue[] = [];
  const k = 2 / (signalPeriod + 1);
  let signal = 0;
  for (let i = 0; i < macdValues.length; i++) {
    if (i === 0) {
      signal = macdValues[i].value;
    } else {
      signal = macdValues[i].value * k + signal * (1 - k);
    }
    if (i >= signalPeriod - 1) {
      signalValues.push({ time: macdValues[i].time, value: signal });
    }
  }

  // Histogram
  const signalMap = new Map(signalValues.map((v) => [v.time, v.value]));
  const histogram: IndicatorValue[] = [];
  for (const mv of macdValues) {
    const sv = signalMap.get(mv.time);
    if (sv !== undefined) {
      histogram.push({ time: mv.time, value: mv.value - sv });
    }
  }

  return { main: macdValues, signal: signalValues, histogram };
}

// Bollinger Bands
export function calculateBollingerBands(
  candles: Candle[],
  period = 20,
  stdDev = 2
): { main: IndicatorValue[]; upper: IndicatorValue[]; lower: IndicatorValue[] } {
  const sma = calculateSMA(candles, period);
  const upper: IndicatorValue[] = [];
  const lower: IndicatorValue[] = [];
  const main: IndicatorValue[] = [];

  for (let i = 0; i < sma.length; i++) {
    const candleIndex = period - 1 + i;
    let sumSq = 0;
    for (let j = 0; j < period; j++) {
      const diff = candles[candleIndex - j].close - sma[i].value;
      sumSq += diff * diff;
    }
    const sd = Math.sqrt(sumSq / period);
    upper.push({ time: sma[i].time, value: sma[i].value + stdDev * sd });
    lower.push({ time: sma[i].time, value: sma[i].value - stdDev * sd });
    main.push(sma[i]);
  }
  return { main, upper, lower };
}

// VWAP
export function calculateVWAP(candles: Candle[]): IndicatorValue[] {
  const result: IndicatorValue[] = [];
  let cumPV = 0;
  let cumVol = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    const vol = c.volume || 1;
    cumPV += tp * vol;
    cumVol += vol;
    result.push({ time: c.time, value: cumPV / cumVol });
  }
  return result;
}

// ATR (Average True Range)
export function calculateATR(candles: Candle[], period = 14): IndicatorValue[] {
  const result: IndicatorValue[] = [];
  if (candles.length < 2) return result;

  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trs.push(tr);
  }

  let atr = 0;
  for (let i = 0; i < Math.min(period, trs.length); i++) {
    atr += trs[i];
  }
  atr /= period;
  result.push({ time: candles[period].time, value: atr });

  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    result.push({ time: candles[i + 1].time, value: atr });
  }
  return result;
}

// Stochastic Oscillator
export function calculateStochastic(
  candles: Candle[],
  kPeriod = 14,
  dPeriod = 3
): { main: IndicatorValue[]; signal: IndicatorValue[] } {
  const kValues: IndicatorValue[] = [];
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = 0; j < kPeriod; j++) {
      highestHigh = Math.max(highestHigh, candles[i - j].high);
      lowestLow = Math.min(lowestLow, candles[i - j].low);
    }
    const k =
      highestHigh === lowestLow
        ? 50
        : ((candles[i].close - lowestLow) / (highestHigh - lowestLow)) * 100;
    kValues.push({ time: candles[i].time, value: k });
  }

  // D = SMA of K
  const signal: IndicatorValue[] = [];
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    let sum = 0;
    for (let j = 0; j < dPeriod; j++) {
      sum += kValues[i - j].value;
    }
    signal.push({ time: kValues[i].time, value: sum / dPeriod });
  }
  return { main: kValues, signal };
}

export function computeIndicator(
  config: IndicatorConfig,
  candles: Candle[]
): IndicatorResult {
  switch (config.type) {
    case 'sma':
      return { config, main: calculateSMA(candles, config.period) };
    case 'ema':
      return { config, main: calculateEMA(candles, config.period) };
    case 'rsi': {
      const main = calculateRSI(candles, config.period);
      return { config, main };
    }
    case 'macd': {
      const { main, signal, histogram } = calculateMACD(
        candles,
        config.period,
        config.period2 || 26,
        config.period3 || 9
      );
      return { config, main, signal, histogram };
    }
    case 'bollinger': {
      const { main, upper, lower } = calculateBollingerBands(candles, config.period);
      return { config, main, upper, lower };
    }
    case 'vwap':
      return { config, main: calculateVWAP(candles) };
    case 'atr':
      return { config, main: calculateATR(candles, config.period) };
    case 'stochastic': {
      const { main, signal } = calculateStochastic(
        candles,
        config.period,
        config.period2 || 3
      );
      return { config, main, signal };
    }
    case 'volume':
      return {
        config,
        main: candles
          .filter((c) => c.volume !== undefined)
          .map((c) => ({ time: c.time, value: c.volume as number })),
      };
    default:
      return { config, main: [] };
  }
}

export const INDICATOR_LABELS: Record<string, string> = {
  sma: 'SMA',
  ema: 'EMA',
  rsi: 'RSI',
  macd: 'MACD',
  bollinger: 'Bollinger Bands',
  vwap: 'VWAP',
  atr: 'ATR',
  stochastic: 'Stochastic',
  volume: 'Volume',
};

export const INDICATOR_DEFAULTS: Record<
  string,
  { period: number; period2?: number; period3?: number; pane: 'main' | 'separate'; color: string }
> = {
  sma: { period: 20, pane: 'main', color: '#f59e0b' },
  ema: { period: 20, pane: 'main', color: '#3b82f6' },
  rsi: { period: 14, pane: 'separate', color: '#a855f7' },
  macd: { period: 12, period2: 26, period3: 9, pane: 'separate', color: '#3b82f6' },
  bollinger: { period: 20, pane: 'main', color: '#8b5cf6' },
  vwap: { period: 0, pane: 'main', color: '#06b6d4' },
  atr: { period: 14, pane: 'separate', color: '#f97316' },
  stochastic: { period: 14, period2: 3, pane: 'separate', color: '#ec4899' },
  volume: { period: 0, pane: 'separate', color: '#52525b' },
};
