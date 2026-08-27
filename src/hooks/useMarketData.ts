import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import type {
  Candle,
  ConnectionStatus,
  MarketStatus,
  PriceUpdate,
  Quote,
  Timeframe,
} from '@/types';
import {
  createMarketDataProvider,
  getGoldMarketSession,
} from '@/services/marketData';

// ============================================================
// Supabase 配置
// ============================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mjdodjohycnegtbqkdms.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZG9kam9oeWNuZWd0YnFrZG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NTcyNTMsImV4cCI6MjEwMzQzMzI1M30.s2s0BACICEKAAAOoifZhdZixvEh9bnm0gpeUklp_xY4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface MarketDataState {
  quote: Quote | null;
  status: ConnectionStatus;
  marketStatus: MarketStatus;
  candles: Candle[];
  loading: boolean;
  error: string | null;
  lastUpdate: PriceUpdate | null;
  priceDirection: 'up' | 'down' | null;
}

export function useMarketData(timeframe: Timeframe) {
  const providerRef = useRef(createMarketDataProvider());
  const [quote, setQuote] = useState<Quote | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(providerRef.current.mode);
  const [marketStatus, setMarketStatus] = useState<MarketStatus>(
    providerRef.current.getMarketStatus()
  );
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<PriceUpdate | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  const dirTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBackendControlledRef = useRef<boolean>(false);
  const [isBackendControlled, setIsBackendControlled] = useState(false);
  const randomWalkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // ============================================================
  // 讀取 Supabase 後台價格
  // ============================================================
  const loadBackendPrice = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('price_control')
        .select('current_price, is_running, target_price, is_complete')
        .limit(1)
        .order('id', { ascending: true });

      if (error) {
        console.warn('讀取 Supabase 價格失敗:', error.message);
        return null;
      }

      if (data && data.length > 0) {
        const record = data[0];
        if (record.is_running || record.is_complete) {
          isBackendControlledRef.current = true;
          setIsBackendControlled(true);
          return {
            price: record.current_price,
            isRunning: record.is_running,
            targetPrice: record.target_price,
            isComplete: record.is_complete,
          };
        }
      }
    } catch (err) {
      console.warn('讀取 Supabase 價格異常:', err);
    }
    return null;
  }, []);

  // ============================================================
  // 初始化時從 Supabase 讀取價格
  // ============================================================
  useEffect(() => {
    const loadInitialPrice = async () => {
      try {
        const { data, error } = await supabase
          .from('price_control')
          .select('*')
          .limit(1)
          .order('id', { ascending: true });

        if (error) {
          console.warn('讀取 Supabase 初始價格失敗:', error.message);
          return;
        }

        if (data && data.length > 0) {
          const record = data[0];
          const price = Number(record.current_price) || 2485.00;
          
          console.log('📊 從 Supabase 載入初始價格:', price);
          lastPriceRef.current = price;
          
          if (record.is_running || record.is_complete) {
            isBackendControlledRef.current = true;
            setIsBackendControlled(true);
          }
          
          setCandles((prevCandles) => {
            if (prevCandles.length === 0) return prevCandles;
            const updatedCandles = [...prevCandles];
            const lastCandle = updatedCandles[updatedCandles.length - 1];
            if (lastCandle) {
              updatedCandles[updatedCandles.length - 1] = {
                ...lastCandle,
                close: price,
                high: Math.max(lastCandle.high, price),
                low: Math.min(lastCandle.low, price),
              };
            }
            return updatedCandles;
          });
          
          setQuote({
            bid: round2(price - 0.18),
            ask: round2(price + 0.18),
            last: price,
            spread: 0.36,
            change: 0,
            changePercent: 0,
            open: price,
            high: price,
            low: price,
            previousClose: price,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        console.warn('讀取 Supabase 初始價格異常:', err);
      }
    };

    loadInitialPrice();
  }, []);

  // ============================================================
  // Fetch historical candles when timeframe changes
  // ============================================================
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    providerRef.current
      .getHistoricalCandles(timeframe, 500)
      .then((data) => {
        if (cancelled) return;
        setCandles(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [timeframe]);

  // ============================================================
  // 獲取初始 Quote（優先使用 Supabase 後台價格）
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    const initQuote = async () => {
      try {
        const backendData = await loadBackendPrice();
        
        if (backendData && backendData.price) {
          const price = backendData.price;
          lastPriceRef.current = price;
          isBackendControlledRef.current = true;
          setIsBackendControlled(true);
          
          setQuote({
            bid: round2(price - 0.18),
            ask: round2(price + 0.18),
            last: price,
            spread: 0.36,
            change: 0,
            changePercent: 0,
            open: price,
            high: price,
            low: price,
            previousClose: price,
            timestamp: Date.now(),
          });
          return;
        }

        const q = await providerRef.current.getCurrentQuote();
        if (cancelled || !q) return;
        setQuote(q);
        lastPriceRef.current = q.last;
      } catch (err) {
        console.warn('獲取初始價格失敗:', err);
      }
    };

    initQuote();

    return () => {
      cancelled = true;
    };
  }, [loadBackendPrice]);

  // ============================================================
  // 訂閱 Supabase Realtime + 隨機浮動（背景價格變動）
  // ============================================================
  useEffect(() => {
    isMountedRef.current = true;

    // 啟動隨機浮動
    const startRandomWalk = () => {
      if (randomWalkIntervalRef.current) {
        clearInterval(randomWalkIntervalRef.current);
        randomWalkIntervalRef.current = null;
      }
      
      console.log('📊 啟動隨機浮動...');
      
      randomWalkIntervalRef.current = setInterval(async () => {
        if (!isMountedRef.current) return;
        
        try {
          // 檢查 Supabase 中是否有正在運行的後台控制
          const { data } = await supabase
            .from('price_control')
            .select('is_running, is_complete')
            .limit(1)
            .order('id', { ascending: true });
          
          if (data && data.length > 0) {
            const record = data[0];
            
            // 只有當 is_running 為 true 時才跳過浮動
            if (record.is_running === true) {
              return;
            }
            
            // 如果 is_complete 為 true，自動重置標誌
            if (record.is_complete === true) {
              console.log('✅ 後台控制已完成，自動重置標誌');
              await supabase
                .from('price_control')
                .update({
                  is_complete: false,
                  is_running: false,
                  updated_at: new Date().toISOString()
                })
                .eq('id', 1);
              isBackendControlledRef.current = false;
              setIsBackendControlled(false);
            }
          }
          
          // 隨機浮動 (±0.3)
          const currentPrice = lastPriceRef.current || 2485;
          const shock = (Math.random() - 0.5) * 0.6;
          const newPrice = Math.max(50, currentPrice + shock);
          const roundedPrice = Math.round(newPrice * 100) / 100;
          
          // 更新 Supabase
          const { error } = await supabase
            .from('price_control')
            .update({
              current_price: roundedPrice,
              updated_at: new Date().toISOString()
            })
            .eq('id', 1);
          
          if (!error && isMountedRef.current) {
            lastPriceRef.current = roundedPrice;
            
            // 更新本地狀態
            setQuote((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                last: roundedPrice,
                bid: round2(roundedPrice - 0.18),
                ask: round2(roundedPrice + 0.18),
              };
            });
            
            // 更新 candles
            setCandles((prev) => {
              if (prev.length === 0) return prev;
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last) {
                updated[updated.length - 1] = {
                  ...last,
                  close: roundedPrice,
                  high: Math.max(last.high, roundedPrice),
                  low: Math.min(last.low, roundedPrice),
                };
              }
              return updated;
            });
          }
        } catch (err) {
          console.warn('隨機浮動錯誤:', err);
        }
      }, 1500);
    };

    // Supabase Realtime 訂閱
    const channel = supabase
      .channel('price_control_sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'price_control',
        },
        (payload) => {
          const record = payload.new;
          const newPrice = Number(record.current_price);
          
          if (!newPrice || isNaN(newPrice)) return;
          
          console.log('📡 Supabase 價格更新:', newPrice);
          
          // 更新價格方向
          if (lastPriceRef.current !== null) {
            if (newPrice > lastPriceRef.current) {
              setPriceDirection('up');
            } else if (newPrice < lastPriceRef.current) {
              setPriceDirection('down');
            }
            if (dirTimeoutRef.current) {
              clearTimeout(dirTimeoutRef.current);
            }
            dirTimeoutRef.current = setTimeout(() => setPriceDirection(null), 600);
          }
          lastPriceRef.current = newPrice;
          
          // 檢查是否為後台控制
          if (record.is_running === true) {
            isBackendControlledRef.current = true;
            setIsBackendControlled(true);
          } else {
            isBackendControlledRef.current = false;
            setIsBackendControlled(false);
          }
          
          // 更新 candles 的最後一根 K 線
          setCandles((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last) {
              const now = Math.floor(Date.now() / 1000);
              const candleAge = now - last.time;
              
              if (candleAge > 60) {
                updated.push({
                  time: Math.floor(now / 60) * 60,
                  open: newPrice,
                  high: newPrice,
                  low: newPrice,
                  close: newPrice,
                  volume: 0,
                });
              } else {
                updated[updated.length - 1] = {
                  ...last,
                  close: newPrice,
                  high: Math.max(last.high, newPrice),
                  low: Math.min(last.low, newPrice),
                };
              }
            }
            return updated;
          });
          
          // 更新 quote
          setQuote((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              last: newPrice,
              bid: round2(newPrice - 0.18),
              ask: round2(newPrice + 0.18),
              high: Math.max(prev.high || newPrice, newPrice),
              low: Math.min(prev.low || newPrice, newPrice),
            };
          });

          // 如果後台控制完成，恢復隨機浮動
          if (record.is_complete === true) {
            console.log('✅ 後台目標達成，恢復隨機浮動');
            isBackendControlledRef.current = false;
            setIsBackendControlled(false);
            supabase
              .from('price_control')
              .update({
                is_complete: false,
                is_running: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', 1)
              .then(() => {
                console.log('🔄 Supabase 標誌已重置');
              });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Supabase Realtime 已訂閱 price_control 表');
          startRandomWalk();
        }
      });

    // 市場會話資訊更新
    const sessionInterval = setInterval(() => {
      const session = getGoldMarketSession();
      setMarketStatus({
        status: providerRef.current.mode,
        label: providerRef.current.getMarketStatus().label,
        isMarketOpen: session.isOpen,
        sessionName: session.session,
      });
    }, 5000);

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
      if (randomWalkIntervalRef.current) {
        clearInterval(randomWalkIntervalRef.current);
        randomWalkIntervalRef.current = null;
      }
      if (dirTimeoutRef.current) {
        clearTimeout(dirTimeoutRef.current);
      }
      clearInterval(sessionInterval);
    };
  }, []);

  // ============================================================
  // 訂閱 Provider 的即時價格更新（僅在非後台控制時使用）
  // ============================================================
  useEffect(() => {
    const provider = providerRef.current;
    
    const callback = (update: PriceUpdate) => {
      if (isBackendControlledRef.current) {
        setLastUpdate(update);
        return;
      }

      setLastUpdate(update);
      const prev = lastPriceRef.current;
      
      if (prev !== null) {
        if (update.last > prev) {
          setPriceDirection('up');
        } else if (update.last < prev) {
          setPriceDirection('down');
        }

        if (dirTimeoutRef.current) {
          clearTimeout(dirTimeoutRef.current);
        }
        dirTimeoutRef.current = setTimeout(() => setPriceDirection(null), 600);
      }
      
      lastPriceRef.current = update.last;

      setCandles((prevCandles) => {
        if (prevCandles.length === 0) return prevCandles;
        const updatedCandles = [...prevCandles];
        const lastCandle = updatedCandles[updatedCandles.length - 1];
        if (lastCandle) {
          const now = Math.floor(Date.now() / 1000);
          const candleAge = now - lastCandle.time;
          if (candleAge > 60) {
            updatedCandles.push({
              time: Math.floor(now / 60) * 60,
              open: update.last,
              high: update.last,
              low: update.last,
              close: update.last,
              volume: 0,
            });
          } else {
            updatedCandles[updatedCandles.length - 1] = {
              ...lastCandle,
              close: update.last,
              high: Math.max(lastCandle.high, update.last),
              low: Math.min(lastCandle.low, update.last),
            };
          }
        }
        return updatedCandles;
      });

      setQuote((prevQuote) => {
        if (!prevQuote) {
          return {
            bid: update.bid,
            ask: update.ask,
            last: update.last,
            spread: round2(update.ask - update.bid),
            change: 0,
            changePercent: 0,
            open: update.last,
            high: update.last,
            low: update.last,
            previousClose: update.last,
            timestamp: update.timestamp,
          };
        }
        return {
          ...prevQuote,
          bid: update.bid,
          ask: update.ask,
          last: update.last,
          spread: round2(update.ask - update.bid),
          high: Math.max(prevQuote.high, update.last),
          low: Math.min(prevQuote.low, update.last),
          change: round2(update.last - prevQuote.previousClose),
          changePercent: round2(
            ((update.last - prevQuote.previousClose) / prevQuote.previousClose) * 100
          ),
          timestamp: update.timestamp,
        };
      });
    };

    provider.subscribeToPriceUpdates(callback);

    return () => {
      provider.unsubscribe();
      if (dirTimeoutRef.current) {
        clearTimeout(dirTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================
  // 手動刷新
  // ============================================================
  const refresh = useCallback(() => {
    setLoading(true);
    providerRef.current
      .getHistoricalCandles(timeframe, 500)
      .then((data) => {
        setCandles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [timeframe]);

  // ============================================================
  // 切換到後台控制模式
  // ============================================================
  const enableBackendControl = useCallback(() => {
    isBackendControlledRef.current = true;
    setIsBackendControlled(true);
  }, []);

  // ============================================================
  // 切換回 Provider 模式
  // ============================================================
  const disableBackendControl = useCallback(() => {
    isBackendControlledRef.current = false;
    setIsBackendControlled(false);
  }, []);

  return {
    quote,
    status,
    marketStatus,
    candles,
    loading,
    error,
    lastUpdate,
    priceDirection,
    refresh,
    provider: providerRef.current,
    isBackendControlled: isBackendControlled,
    enableBackendControl,
    disableBackendControl,
    loadBackendPrice,
  };
}

// ============================================================
// 工具函數
// ============================================================
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}