import { useState, useCallback, useMemo, useEffect } from 'react';
import { Info, ChevronRight, ChevronLeft } from 'lucide-react';
import { Header } from '@/components/header/Header';
import { ChartToolbar, type DrawingTool } from '@/components/chart/ChartToolbar';
import { TimeframeSelector, type TimeframeId } from '@/components/chart/TimeframeSelector';
import { MainChart } from '@/components/chart/MainChart';
import { OHLCLegend } from '@/components/chart/OHLCLegend';
import { IndicatorsPanel } from '@/components/indicators/IndicatorsPanel';
import { MarketInfoPanel } from '@/components/MarketInfoPanel';
import { OrderPanel } from '@/components/order-panel/OrderPanel';
import { PositionsPanel } from '@/components/positions/PositionsPanel';
import { AlertsPanel } from '@/components/alerts/AlertsPanel';
import { SettingsModal } from '@/components/SettingsModal';
import { BackendControlPanel } from '@/components/backend/BackendControlPanel';
import { useMarketData } from '@/hooks/useMarketData';
import { useTradingStore } from '@/hooks/useTradingStore';
import { computeIndicator, INDICATOR_DEFAULTS } from '@/services/indicators';
import type {
  IndicatorConfig,
  IndicatorType,
  IndicatorResult,
  Settings,
  OrderSide,
} from '@/types';
import type { IChartApi } from 'lightweight-charts';

const DEFAULT_SETTINGS: Settings = {
  chartType: 'candles',
  showGrid: true,
  showCrosshair: true,
  autoScale: false,
  theme: 'dark',
  defaultQuantity: 1.0,
  defaultStopLoss: 5.0,
  defaultTakeProfit: 10.0,
  provider: 'auto',
};

const SETTINGS_KEY = 'aurum-terminal-settings-v1';

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

function App() {
  const [timeframe, setTimeframe] = useState<TimeframeId>('15m');
  const [activeTool, setActiveTool] = useState<DrawingTool>('crosshair');
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [hoverData, setHoverData] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    volume: number;
    time: number;
  } | null>(null);
  const [chartApi, setChartApi] = useState<IChartApi | null>(null);
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([]);
  const [showBackendControl, setShowBackendControl] = useState(true);

  const {
    quote,
    status,
    marketStatus,
    candles,
    loading,
    error,
    priceDirection,
    provider,
  } = useMarketData(timeframe);

  const {
    positions,
    orders,
    history,
    alerts,
    placePaperTrade,
    closePosition,
    cancelOrder,
    addAlert,
    toggleAlert,
    deleteAlert,
    clearHistory,
  } = useTradingStore(quote?.last ?? null);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Compute indicator results
  const indicatorResults: IndicatorResult[] = useMemo(() => {
    if (candles.length === 0) return [];
    return indicators
      .filter((i) => i.visible)
      .map((config) => computeIndicator(config, candles));
  }, [indicators, candles]);

  // Add indicator
  const handleAddIndicator = useCallback((type: IndicatorType) => {
    const defaults = INDICATOR_DEFAULTS[type];
    const newConfig: IndicatorConfig = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      period: defaults.period,
      period2: defaults.period2,
      period3: defaults.period3,
      color: defaults.color,
      visible: true,
      pane: defaults.pane,
    };
    setIndicators((prev) => [...prev, newConfig]);
  }, []);

  const handleRemoveIndicator = useCallback((id: string) => {
    setIndicators((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleToggleIndicator = useCallback((id: string) => {
    setIndicators((prev) =>
      prev.map((i) => (i.id === id ? { ...i, visible: !i.visible } : i))
    );
  }, []);

  const handleUpdateIndicator = useCallback(
    (id: string, updates: Partial<IndicatorConfig>) => {
      setIndicators((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
      );
    },
    []
  );

  // Chart actions
  const handleZoomIn = useCallback(() => {
    if (chartApi) (chartApi as any)._zoomIn?.();
  }, [chartApi]);

  const handleZoomOut = useCallback(() => {
    if (chartApi) (chartApi as any)._zoomOut?.();
  }, [chartApi]);

  const handleReset = useCallback(() => {
    if (chartApi) (chartApi as any)._reset?.();
  }, [chartApi]);

  const handleScreenshot = useCallback(() => {
    if (!chartApi) return;
    try {
      const canvas = (chartApi as any).takeScreenshot?.() as HTMLCanvasElement | undefined;
      if (canvas) {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `xauusd-chart-${Date.now()}.png`;
        a.click();
      }
    } catch {
      // ignore
    }
  }, [chartApi]);

  // Place paper trade
  const handlePlaceTrade = useCallback(
    (
      side: OrderSide,
      quantity: number,
      entryPrice: number,
      stopLoss?: number,
      takeProfit?: number
    ) => {
      placePaperTrade(side, quantity, entryPrice, stopLoss, takeProfit);
    },
    [placePaperTrade]
  );

  // Fullscreen
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const activeAlertCount = alerts.filter((a) => a.enabled).length;

  // Fullscreen chart view
  if (isFullscreen) {
    return (
      <div className="h-screen flex flex-col bg-bg-base">
        <Header
          quote={quote}
          status={status}
          marketStatus={marketStatus}
          priceDirection={priceDirection}
          onOpenSettings={() => setShowSettings(true)}
          onToggleFullscreen={handleToggleFullscreen}
          isFullscreen={true}
          onOpenAlerts={() => setShowAlerts(true)}
          alertCount={activeAlertCount}
        />
        <div className="flex items-center justify-between px-3 py-1.5 bg-bg-panel border-b border-border">
          <div className="flex items-center gap-3">
            <TimeframeSelector active={timeframe} onChange={setTimeframe} />
          </div>
          <ChartToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            chartType={settings.chartType}
            onChartTypeChange={(t) => setSettings((s) => ({ ...s, chartType: t }))}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleReset}
            onScreenshot={handleScreenshot}
          />
        </div>
        <div className="flex-1 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-txt-muted text-sm z-20">
              Loading chart data...
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-bear text-sm z-20">
              {error}
            </div>
          )}
          <OHLCLegend data={hoverData} timeframe={timeframe} />
          <MainChart
            candles={candles}
            chartType={settings.chartType}
            showGrid={settings.showGrid}
            showCrosshair={settings.showCrosshair}
            autoScale={settings.autoScale}
            indicators={indicatorResults}
            positions={positions}
            alerts={alerts}
            onCrosshairMove={setHoverData}
            onChartReady={setChartApi}
          />
        </div>
        {showSettings && (
          <SettingsModal
            settings={settings}
            onChange={(updates) => setSettings((s) => ({ ...s, ...updates }))}
            onClose={() => setShowSettings(false)}
            providerName={provider.name}
            connectionStatus={status}
          />
        )}
        {showAlerts && (
          <AlertsPanel
            alerts={alerts}
            quote={quote}
            onAddAlert={addAlert}
            onToggleAlert={toggleAlert}
            onDeleteAlert={deleteAlert}
            onClose={() => setShowAlerts(false)}
          />
        )}
      </div>
    );
  }

  // Main layout
  return (
    <div className="h-screen flex flex-col bg-bg-base overflow-hidden">
      <Header
        quote={quote}
        status={status}
        marketStatus={marketStatus}
        priceDirection={priceDirection}
        onOpenSettings={() => setShowSettings(true)}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={false}
        onOpenAlerts={() => setShowAlerts(true)}
        alertCount={activeAlertCount}
      />

      {/* Chart toolbar row */}
      <div className="flex items-center justify-between px-2 bg-bg-panel border-b border-border">
        <TimeframeSelector active={timeframe} onChange={setTimeframe} />
        <ChartToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          chartType={settings.chartType}
          onChartTypeChange={(t) => setSettings((s) => ({ ...s, chartType: t }))}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
          onScreenshot={handleScreenshot}
        />
      </div>

      {/* Indicators bar */}
      <div className="flex items-center px-3 py-1.5 bg-bg-panel border-b border-border-subtle overflow-x-auto">
        <IndicatorsPanel
          indicators={indicators}
          onAdd={handleAddIndicator}
          onRemove={handleRemoveIndicator}
          onToggle={handleToggleIndicator}
          onUpdate={handleUpdateIndicator}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chart area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative overflow-hidden">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center text-txt-muted text-sm z-20">
                Loading chart data...
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center text-bear text-sm z-20">
                {error}
              </div>
            )}
            <OHLCLegend data={hoverData} timeframe={timeframe} />
            <MainChart
              candles={candles}
              chartType={settings.chartType}
              showGrid={settings.showGrid}
              showCrosshair={settings.showCrosshair}
              autoScale={settings.autoScale}
              indicators={indicatorResults}
              positions={positions}
              alerts={alerts}
              onCrosshairMove={setHoverData}
              onChartReady={setChartApi}
            />
          </div>

          {/* Positions panel */}
          <PositionsPanel
            positions={positions}
            orders={orders}
            history={history}
            currentPrice={quote?.last ?? null}
            onClosePosition={closePosition}
            onCancelOrder={cancelOrder}
            onClearHistory={clearHistory}
          />
        </div>

        {/* Right sidebar */}
        {showSidebar && (
          <div className="w-80 lg:w-96 flex-shrink-0 border-l border-border bg-bg-panel overflow-y-auto hidden md:block">
            <div className="p-2.5 space-y-2.5">
              <MarketInfoPanel quote={quote} candles={candles} />
              
              {/* 後台控制面板 */}
              {(import.meta.env.DEV || import.meta.env.VITE_SHOW_BACKEND === 'true') && (
                <div className="relative">
                  <button
                    onClick={() => setShowBackendControl(!showBackendControl)}
                    className="w-full flex items-center justify-between px-2 py-1 text-xs text-txt-muted hover:text-txt-secondary hover:bg-bg-hover rounded transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                      🎮 後台控制
                    </span>
                    <span>{showBackendControl ? '▼' : '▶'}</span>
                  </button>
                  {showBackendControl && (
                    <div className="mt-1.5">
                      <BackendControlPanel />
                    </div>
                  )}
                </div>
              )}
              
              <OrderPanel
                quote={quote}
                defaultQuantity={settings.defaultQuantity}
                defaultStopLoss={settings.defaultStopLoss}
                defaultTakeProfit={settings.defaultTakeProfit}
                onPlaceTrade={handlePlaceTrade}
              />
            </div>
          </div>
        )}

        {/* Sidebar toggle */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="hidden md:flex items-center justify-center w-5 bg-bg-panel border-l border-border text-txt-muted hover:text-txt-secondary hover:bg-bg-hover transition-colors"
        >
          {showSidebar ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Disclaimer bar */}
      <div className="flex items-center justify-center px-3 py-1 bg-bg-panel border-t border-border-subtle">
        <div className="flex items-center gap-1.5 text-2xs text-txt-faint">
          <Info size={10} />
          <span>
            Market data may be delayed depending on the selected data provider. This platform is for charting and paper-trading purposes only.
          </span>
        </div>
      </div>

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onChange={(updates) => setSettings((s) => ({ ...s, ...updates }))}
          onClose={() => setShowSettings(false)}
          providerName={provider.name}
          connectionStatus={status}
        />
      )}
      {showAlerts && (
        <AlertsPanel
          alerts={alerts}
          quote={quote}
          onAddAlert={addAlert}
          onToggleAlert={toggleAlert}
          onDeleteAlert={deleteAlert}
          onClose={() => setShowAlerts(false)}
        />
      )}
    </div>
  );
}

export default App;