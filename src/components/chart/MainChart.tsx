import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import type {
  Candle,
  ChartType,
  IndicatorResult,
  PaperPosition,
  PriceAlert,
} from '@/types';

interface MainChartProps {
  candles: Candle[];
  chartType: ChartType;
  showGrid: boolean;
  showCrosshair: boolean;
  autoScale: boolean;
  indicators: IndicatorResult[];
  positions: PaperPosition[];
  alerts: PriceAlert[];
  onCrosshairMove: (params: {
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    volume: number;
    time: number;
  } | null) => void;
  onChartReady?: (api: IChartApi) => void;
}

export function MainChart({
  candles,
  chartType,
  showGrid,
  showCrosshair,
  autoScale,
  indicators,
  positions,
  alerts,
  onCrosshairMove,
  onChartReady,
}: MainChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Candlestick' | 'Bar' | 'Line' | 'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRef = useRef<ISeriesApi<'Line' | 'Histogram'>[]>([]);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const isFirstLoadRef = useRef(true);

  // Create chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0b' },
        textColor: '#71717a',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: {
          color: 'rgba(42, 42, 46, 0.3)',
          style: LineStyle.Solid,
        },
        horzLines: {
          color: 'rgba(42, 42, 46, 0.3)',
          style: LineStyle.Solid,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#3a3a3e',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1a1a1e',
        },
        horzLine: {
          color: '#3a3a3e',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1a1a1e',
        },
      },
      rightPriceScale: {
        borderColor: '#222225',
        scaleMargins: { top: 0.08, bottom: 0.28 },
        autoScale: autoScale,
      },
      timeScale: {
        borderColor: '#222225',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    chartRef.current = chart;
    onChartReady?.(chart);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
      indicatorSeriesRef.current = [];
      isFirstLoadRef.current = true;
    };
  }, []);

  // Update grid/crosshair settings
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      grid: {
        vertLines: { visible: showGrid },
        horzLines: { visible: showGrid },
      },
      crosshair: {
        vertLine: { labelVisible: showCrosshair },
        horzLine: { labelVisible: showCrosshair },
      },
      rightPriceScale: {
        autoScale: autoScale,
      },
    });
  }, [showGrid, showCrosshair, autoScale]);

  // Create/replace main series when chart type changes
  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;
    const chart = chartRef.current;

    if (mainSeriesRef.current) {
      try {
        chart.removeSeries(mainSeriesRef.current);
      } catch {
        // already removed
      }
      mainSeriesRef.current = null;
    }

    let series: ISeriesApi<'Candlestick' | 'Bar' | 'Line' | 'Area'>;

    if (chartType === 'candles') {
      series = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        priceLineColor: '#3a3a3e',
        priceLineStyle: LineStyle.Dashed,
      });
      series.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    } else if (chartType === 'bars') {
      series = chart.addBarSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        thinBars: false,
      });
      series.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    } else if (chartType === 'line') {
      series = chart.addLineSeries({
        color: '#d4af37',
        lineWidth: 2,
      });
      series.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.close,
        }))
      );
    } else {
      series = chart.addAreaSeries({
        lineColor: '#d4af37',
        topColor: 'rgba(212, 175, 55, 0.25)',
        bottomColor: 'rgba(212, 175, 55, 0.02)',
        lineWidth: 2,
      });
      series.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.close,
        }))
      );
    }

    mainSeriesRef.current = series;

    if (isFirstLoadRef.current) {
      chart.timeScale().fitContent();
      isFirstLoadRef.current = false;
    }
  }, [chartType, candles]);

  // Volume series
  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;
    const chart = chartRef.current;

    if (volumeSeriesRef.current) {
      try {
        chart.removeSeries(volumeSeriesRef.current);
      } catch {
        // ignore
      }
    }

    const hasVolume = candles.some((c) => c.volume !== undefined);
    if (!hasVolume) return;

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volumeSeries.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume || 0,
        color: c.close >= c.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
      }))
    );

    volumeSeriesRef.current = volumeSeries;

    return () => {
      if (volumeSeriesRef.current) {
        try {
          chart.removeSeries(volumeSeriesRef.current);
        } catch {
          // ignore
        }
        volumeSeriesRef.current = null;
      }
    };
  }, [candles]);

  // Render indicators
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;

    indicatorSeriesRef.current.forEach((s) => {
      try {
        chart.removeSeries(s);
      } catch {
        // ignore
      }
    });
    indicatorSeriesRef.current = [];

    for (const result of indicators) {
      if (!result.config.visible) continue;

      if (result.config.pane === 'separate') {
        if (result.config.type === 'volume') {
          const volSeries = chart.addHistogramSeries({
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume2',
            color: 'rgba(82, 82, 91, 0.5)',
          });
          volSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.85, bottom: 0.05 },
          });
          volSeries.setData(
            result.main.map((v) => ({
              time: v.time as UTCTimestamp,
              value: v.value,
            }))
          );
          indicatorSeriesRef.current.push(volSeries);
          continue;
        }

        if (result.main.length > 0) {
          const lineSeries = chart.addLineSeries({
            color: result.config.color,
            lineWidth: 1,
            priceScaleId: `sep_${result.config.id}`,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          lineSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.75, bottom: 0.05 },
          });
          lineSeries.setData(
            result.main.map((v) => ({
              time: v.time as UTCTimestamp,
              value: v.value,
            }))
          );
          indicatorSeriesRef.current.push(lineSeries);

          if (result.signal && result.signal.length > 0) {
            const sigSeries = chart.addLineSeries({
              color: '#f59e0b',
              lineWidth: 1,
              priceScaleId: `sep_${result.config.id}`,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            sigSeries.setData(
              result.signal.map((v) => ({
                time: v.time as UTCTimestamp,
                value: v.value,
              }))
            );
            indicatorSeriesRef.current.push(sigSeries);
          }

          if (result.histogram && result.histogram.length > 0) {
            const histSeries = chart.addHistogramSeries({
              priceScaleId: `sep_${result.config.id}`,
              priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            });
            histSeries.priceScale().applyOptions({
              scaleMargins: { top: 0.75, bottom: 0.05 },
            });
            histSeries.setData(
              result.histogram.map((v) => ({
                time: v.time as UTCTimestamp,
                value: v.value,
                color: v.value >= 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)',
              }))
            );
            indicatorSeriesRef.current.push(histSeries);
          }
        }
        continue;
      }

      if (result.main.length > 0) {
        const lineSeries = chart.addLineSeries({
          color: result.config.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
        });
        lineSeries.setData(
          result.main.map((v) => ({
            time: v.time as UTCTimestamp,
            value: v.value,
          }))
        );
        indicatorSeriesRef.current.push(lineSeries);
      }

      if (result.upper && result.upper.length > 0) {
        const upperSeries = chart.addLineSeries({
          color: 'rgba(139, 92, 246, 0.6)',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          lineStyle: LineStyle.Dotted,
        });
        upperSeries.setData(
          result.upper.map((v) => ({
            time: v.time as UTCTimestamp,
            value: v.value,
          }))
        );
        indicatorSeriesRef.current.push(upperSeries);
      }

      if (result.lower && result.lower.length > 0) {
        const lowerSeries = chart.addLineSeries({
          color: 'rgba(139, 92, 246, 0.6)',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          lineStyle: LineStyle.Dotted,
        });
        lowerSeries.setData(
          result.lower.map((v) => ({
            time: v.time as UTCTimestamp,
            value: v.value,
          }))
        );
        indicatorSeriesRef.current.push(lowerSeries);
      }
    }
  }, [indicators]);

  // Position and alert price lines
  useEffect(() => {
    if (!mainSeriesRef.current) return;
    const series = mainSeriesRef.current;

    priceLinesRef.current.forEach((line) => {
      try {
        series.removePriceLine(line);
      } catch {
        // ignore
      }
    });
    priceLinesRef.current = [];

    for (const pos of positions) {
      if (pos.status !== 'open') continue;
      const line = series.createPriceLine({
        price: pos.entryPrice,
        color: pos.side === 'buy' ? '#22c55e' : '#ef4444',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `${pos.side.toUpperCase()} ${pos.quantity}`,
      });
      priceLinesRef.current.push(line);

      if (pos.stopLoss) {
        const slLine = series.createPriceLine({
          price: pos.stopLoss,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'SL',
        });
        priceLinesRef.current.push(slLine);
      }

      if (pos.takeProfit) {
        const tpLine = series.createPriceLine({
          price: pos.takeProfit,
          color: '#22c55e',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'TP',
        });
        priceLinesRef.current.push(tpLine);
      }
    }

    for (const alert of alerts) {
      if (!alert.enabled) continue;
      const line = series.createPriceLine({
        price: alert.price,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `Alert ${alert.condition}`,
      });
      priceLinesRef.current.push(line);
    }
  }, [positions, alerts]);

  // Crosshair move handler
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !mainSeriesRef.current) {
        onCrosshairMove(null);
        return;
      }

      const time = param.time as number;
      const candle = candles.find((c) => c.time === time);
      if (!candle) {
        onCrosshairMove(null);
        return;
      }

      const change = candle.close - candle.open;
      onCrosshairMove({
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        change,
        volume: candle.volume || 0,
        time: candle.time,
      });
    });
  }, [candles, onCrosshairMove]);

  // Expose zoom/reset via chart API
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    
    (chart as any)._zoomIn = () => {
      const ts = chart.timeScale();
      const range = ts.getVisibleRange() as { from: number; to: number } | null;
      if (range) {
        const span = (range.to - range.from) * 0.8;
        ts.setVisibleRange({ from: range.from as Time, to: (range.from + span) as Time });
      }
    };
    (chart as any)._zoomOut = () => {
      const ts = chart.timeScale();
      const range = ts.getVisibleRange() as { from: number; to: number } | null;
      if (range) {
        const span = (range.to - range.from) * 1.25;
        ts.setVisibleRange({ from: (range.to - span) as Time, to: range.to as Time });
      }
    };
    (chart as any)._reset = () => {
      chart.timeScale().fitContent();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}