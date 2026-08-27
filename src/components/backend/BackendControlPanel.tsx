import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Settings, Zap } from 'lucide-react';
import { backendClient } from '@/services/backendClient';

export function BackendControlPanel() {
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [duration, setDuration] = useState<number>(30);
  const [currentPrice, setCurrentPrice] = useState<number>(2485.00);
  const [targetPriceDisplay, setTargetPriceDisplay] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('就緒');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // 嘗試連接後端 (僅用於本地開發)
    backendClient.connect();

    const onConnected = () => {
      setIsConnected(true);
      setStatusMessage('已連接本地後端');
    };

    const onDisconnected = () => {
      setIsConnected(false);
      setStatusMessage('本地後端未連接，使用 Supabase 控制');
    };

    const onInit = (data: any) => {
      setCurrentPrice(data.price);
      if (data.targetPrice) {
        setTargetPriceDisplay(data.targetPrice);
        setIsRunning(data.isRunning);
        setProgress(data.progress || 0);
        setStatusMessage(`目標: ${data.targetPrice.toFixed(2)}`);
      }
    };

    const onPriceUpdate = (data: any) => {
      setCurrentPrice(data.price);
      setProgress(data.progress);
      setTargetPriceDisplay(data.targetPrice);
      setIsRunning(!data.isComplete);
      if (data.isComplete) {
        setStatusMessage('✅ 已達到目標價格');
      } else {
        setStatusMessage(`⏳ 正在模擬: ${(data.progress * 100).toFixed(1)}%`);
      }
    };

    const onTargetReached = (data: any) => {
      setStatusMessage(`✅ ${data.message}`);
      setIsRunning(false);
      setProgress(1);
    };

    backendClient.on('connected', onConnected);
    backendClient.on('disconnected', onDisconnected);
    backendClient.on('init', onInit);
    backendClient.on('priceUpdate', onPriceUpdate);
    backendClient.on('targetReached', onTargetReached);

    // 獲取初始狀態
    backendClient.getPriceStatus().then(data => {
      if (data && data.price) {
        setCurrentPrice(data.price);
        if (data.targetPrice) {
          setTargetPriceDisplay(data.targetPrice);
          setIsRunning(data.isRunning);
          setProgress(data.progress);
        }
      }
    }).catch(err => {
      console.warn('無法從本地後端獲取狀態，可能未啟動', err);
    });

    return () => {
      backendClient.disconnect();
    };
  }, []);

  // 設定價格目標
  const handleSetTarget = async () => {
    const price = parseFloat(targetPrice);
    if (!price || price <= 0) {
      setStatusMessage('❌ 請輸入有效的目標價格');
      return;
    }

    if (!duration || duration < 1) {
      setStatusMessage('❌ 請選擇有效的時間');
      return;
    }

    try {
      setStatusMessage('⏳ 正在設定...');
      const result = await backendClient.setPriceTarget(price, duration);
      setTargetPriceDisplay(result.targetPrice);
      setProgress(0);
      setIsRunning(true);
      setStatusMessage(`🎯 目標已設定: ${result.message}`);
      setTargetPrice('');
    } catch (error: any) {
      setStatusMessage(`❌ ${error.message}`);
    }
  };

  // 重置
  const handleReset = async () => {
    try {
      const result = await backendClient.resetPrice();
      setCurrentPrice(result.price);
      setTargetPriceDisplay(null);
      setProgress(0);
      setIsRunning(false);
      setIsPaused(false);
      setStatusMessage('🔄 已重置');
    } catch (error) {
      console.error('重置失敗:', error);
    }
  };

  // 暫停/繼續
  const handleTogglePause = async () => {
    try {
      const result = await backendClient.togglePause();
      setIsPaused(!isPaused);
      setStatusMessage(isPaused ? '▶️ 已繼續' : '⏸️ 已暫停');
    } catch (error) {
      console.error('操作失敗:', error);
    }
  };

  // 快速設定按鈕
  const quickSet = (price: number, seconds: number) => {
    setTargetPrice(price.toString());
    setDuration(seconds);
    // 自動執行
    setTimeout(() => handleSetTarget(), 100);
  };

  return (
    <div className="bg-bg-panel border border-border rounded-lg p-4 w-full max-w-md">
      {/* 標題 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-gold" />
          <span className="text-sm font-bold text-txt-primary">後台價格控制</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xs ${isConnected ? 'text-bull' : 'text-bear'}`}>
            {isConnected ? '● 本地已連接' : '○ 本地未連接'}
          </span>
        </div>
      </div>

      {/* 當前價格顯示 */}
      <div className="bg-bg-elevated border border-border rounded p-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-txt-muted">當前價格</span>
          <span className="text-xl font-mono font-bold text-gold">
            {currentPrice.toFixed(2)}
          </span>
        </div>
        {targetPriceDisplay && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-txt-muted">目標價格</span>
            <span className="text-sm font-mono text-txt-secondary">
              {targetPriceDisplay.toFixed(2)}
              <span className="text-xs text-txt-muted ml-2">
                ({isRunning ? '進行中' : isPaused ? '已暫停' : '完成'})
              </span>
            </span>
          </div>
        )}
        {/* 進度條 */}
        {targetPriceDisplay && (
          <div className="mt-2">
            <div className="w-full h-1.5 bg-bg-input rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-100 rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-2xs text-txt-faint mt-0.5">
              <span>{currentPrice.toFixed(2)}</span>
              <span>{(progress * 100).toFixed(0)}%</span>
              <span>{targetPriceDisplay.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* 控制區域 */}
      <div className="space-y-3">
        {/* 價格輸入 */}
        <div>
          <label className="text-2xs text-txt-muted block mb-1">
            目標價格 (XAU/USD)
          </label>
          <input
            type="number"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            step="0.01"
            placeholder="例如: 2500.00"
            className="w-full bg-bg-input border border-border rounded px-3 py-2 text-sm font-mono text-txt-primary focus:border-gold/50 focus:outline-none"
          />
        </div>

        {/* 時間選擇 */}
        <div>
          <label className="text-2xs text-txt-muted block mb-1">
            持續時間
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full bg-bg-input border border-border rounded px-3 py-2 text-sm text-txt-primary focus:border-gold/50 focus:outline-none"
          >
            <option value={5}>5 秒</option>
            <option value={10}>10 秒</option>
            <option value={15}>15 秒</option>
            <option value={30}>30 秒</option>
            <option value={45}>45 秒</option>
            <option value={60}>60 秒</option>
            <option value={120}>2 分鐘</option>
            <option value={300}>5 分鐘</option>
          </select>
        </div>

        {/* 按鈕組 */}
        <div className="flex gap-2">
          <button
            onClick={handleSetTarget}
            disabled={isRunning && !isPaused}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded bg-gold/20 text-gold hover:bg-gold/30 border border-gold/30 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap size={16} />
            設定目標
          </button>
          
          <button
            onClick={handleTogglePause}
            disabled={!isRunning}
            className="px-4 py-2 rounded bg-bg-elevated text-txt-secondary hover:bg-bg-hover border border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>

          <button
            onClick={handleReset}
            className="px-4 py-2 rounded bg-bg-elevated text-txt-secondary hover:bg-bg-hover border border-border transition-colors"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* 快速設定 */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-2xs text-txt-faint mr-1">快速:</span>
          <button
            onClick={() => quickSet(2500, 30)}
            className="px-2 py-0.5 rounded text-2xs bg-bg-elevated text-txt-muted hover:bg-bg-hover border border-border transition-colors"
          >
            +15 (30s)
          </button>
          <button
            onClick={() => quickSet(2480, 20)}
            className="px-2 py-0.5 rounded text-2xs bg-bg-elevated text-txt-muted hover:bg-bg-hover border border-border transition-colors"
          >
            -5 (20s)
          </button>
          <button
            onClick={() => quickSet(2600, 120)}
            className="px-2 py-0.5 rounded text-2xs bg-bg-elevated text-txt-muted hover:bg-bg-hover border border-border transition-colors"
          >
            +115 (2m)
          </button>
          <button
            onClick={() => quickSet(2400, 90)}
            className="px-2 py-0.5 rounded text-2xs bg-bg-elevated text-txt-muted hover:bg-bg-hover border border-border transition-colors"
          >
            -85 (1.5m)
          </button>
        </div>

        {/* 狀態消息 */}
        <div className="text-xs text-txt-muted text-center border-t border-border-subtle pt-2">
          {statusMessage}
        </div>
      </div>
    </div>
  );
}