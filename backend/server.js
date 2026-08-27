import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { PriceSimulator } from './services/priceSimulator.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// 中間件
app.use(cors());
app.use(express.json());

// 價格模擬器實例
const priceSimulator = new PriceSimulator();

// ============ REST API ============

// 獲取當前價格
app.get('/api/price', (req, res) => {
  res.json({
    price: priceSimulator.getCurrentPrice(),
    targetPrice: priceSimulator.getTargetPrice(),
    isRunning: priceSimulator.isRunning(),
    progress: priceSimulator.getProgress(),
  });
});

// 設定價格目標
app.post('/api/price/target', (req, res) => {
  const { targetPrice, duration } = req.body;

  // 驗證輸入
  if (targetPrice === undefined || targetPrice === null) {
    return res.status(400).json({ error: '請輸入目標價格' });
  }
  if (typeof targetPrice !== 'number' || targetPrice <= 0) {
    return res.status(400).json({ error: '目標價格必須是大於0的數字' });
  }
  if (!duration || typeof duration !== 'number' || duration < 1) {
    return res.status(400).json({ error: '請選擇有效的时间（至少1秒）' });
  }

  try {
    const result = priceSimulator.setTarget(targetPrice, duration);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 停止價格模擬（立即回到初始價格）
app.post('/api/price/reset', (req, res) => {
  priceSimulator.reset();
  res.json({ success: true, price: priceSimulator.getCurrentPrice() });
});

// 暫停/繼續
app.post('/api/price/toggle', (req, res) => {
  const isRunning = priceSimulator.togglePause();
  res.json({ isRunning });
});

// ============ WebSocket ============

// WebSocket 連接處理
wss.on('connection', (ws) => {
  console.log('✅ 前端已連接到後台 WebSocket');

  // 發送初始價格
  ws.send(JSON.stringify({
    type: 'init',
    price: priceSimulator.getCurrentPrice(),
    targetPrice: priceSimulator.getTargetPrice(),
    isRunning: priceSimulator.isRunning(),
    progress: priceSimulator.getProgress(),
  }));

  // 價格更新監聽器
  const onPriceUpdate = (data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'priceUpdate',
        ...data,
      }));
    }
  };

  priceSimulator.on('update', onPriceUpdate);

  // 目標達成通知
  const onTargetReached = (data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'targetReached',
        ...data,
      }));
    }
  };

  priceSimulator.on('targetReached', onTargetReached);

  ws.on('close', () => {
    console.log('❌ 前端斷開連接');
    priceSimulator.off('update', onPriceUpdate);
    priceSimulator.off('targetReached', onTargetReached);
  });
});

// ============ 啟動服務器 ============

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 後台服務器運行在 http://localhost:${PORT}`);
  console.log(`📊 當前價格: ${priceSimulator.getCurrentPrice().toFixed(2)}`);
});