import { EventEmitter } from 'events';

export class PriceSimulator extends EventEmitter {
  constructor(initialPrice = 2485.00) {
    super();
    this.currentPrice = initialPrice;
    this.initialPrice = initialPrice;
    this.targetPrice = null;
    this.duration = 0;
    this.elapsed = 0;
    this.isPaused = false;
    this.isRunning = false;
    this.updateInterval = null;
    this.lastUpdateTime = null;
    this.randomWalkInterval = null;
  }

  // 獲取當前價格
  getCurrentPrice() {
    return this.currentPrice;
  }

  // 獲取目標價格
  getTargetPrice() {
    return this.targetPrice;
  }

  // 獲取進度 (0-1)
  getProgress() {
    if (!this.targetPrice || this.duration === 0) return 0;
    return Math.min(this.elapsed / this.duration, 1);
  }

  // 是否正在運行
  isRunning() {
    return this.isRunning;
  }

  // 設置目標
  setTarget(targetPrice, durationSeconds) {
    // 驗證
    if (targetPrice <= 0) {
      throw new Error('目標價格必須大於 0');
    }
    if (durationSeconds < 1) {
      throw new Error('持續時間至少為 1 秒');
    }

    // 停止當前的模擬和隨機浮動
    this.stop();
    this.stopRandomWalk();

    // 設定新目標
    this.targetPrice = targetPrice;
    this.duration = durationSeconds;
    this.elapsed = 0;
    this.initialPrice = this.currentPrice;
    this.isPaused = false;
    this.isRunning = true;
    this.lastUpdateTime = Date.now();

    // 開始模擬
    this.start();

    return {
      currentPrice: this.currentPrice,
      targetPrice: this.targetPrice,
      duration: this.duration,
      message: `將在 ${durationSeconds} 秒內從 ${this.currentPrice.toFixed(2)} 達到 ${targetPrice.toFixed(2)}`,
    };
  }

  // 開始模擬
  start() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.lastUpdateTime = Date.now();

    this.updateInterval = setInterval(() => {
      this.update();
    }, 50);
  }

  // 更新價格
  update() {
    if (this.isPaused) {
      this.lastUpdateTime = Date.now();
      return;
    }

    const now = Date.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;

    this.elapsed += deltaTime;

    let progress = Math.min(this.elapsed / this.duration, 1);
    const easedProgress = this.easeInOut(progress);

    const priceRange = this.targetPrice - this.initialPrice;
    this.currentPrice = this.initialPrice + priceRange * easedProgress;
    this.currentPrice = Math.round(this.currentPrice * 100) / 100;

    this.emit('update', {
      price: this.currentPrice,
      targetPrice: this.targetPrice,
      progress: progress,
      elapsed: this.elapsed,
      duration: this.duration,
      isComplete: progress >= 1,
      isRandomWalk: false,
    });

    if (progress >= 1) {
      this.currentPrice = this.targetPrice;
      this.stop();

      this.emit('targetReached', {
        price: this.currentPrice,
        targetPrice: this.targetPrice,
        duration: this.duration,
        message: `✅ 已達到目標價格 ${this.targetPrice.toFixed(2)}`,
      });

      // 到達目標後，恢復隨機浮動
      this.startRandomWalk();
    }
  }

  // 緩動函數 (easeInOut)
  easeInOut(t) {
    return t < 0.5 
      ? 2 * t * t 
      : -1 + (4 - 2 * t) * t;
  }

  // 停止模擬
  stop() {
    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // 開始隨機浮動（到達目標後自動恢復）
  startRandomWalk() {
    if (this.randomWalkInterval) {
      clearInterval(this.randomWalkInterval);
    }
    
    this.randomWalkInterval = setInterval(() => {
      if (this.isPaused) return;
      if (this.isRunning) return;
      
      const shock = (Math.random() - 0.5) * 0.4;
      this.currentPrice = Math.max(50, this.currentPrice + shock);
      this.currentPrice = Math.round(this.currentPrice * 100) / 100;
      
      this.emit('update', {
        price: this.currentPrice,
        targetPrice: null,
        progress: 0,
        elapsed: 0,
        duration: 0,
        isComplete: false,
        isRandomWalk: true,
      });
    }, 1500);
  }

  // 停止隨機浮動
  stopRandomWalk() {
    if (this.randomWalkInterval) {
      clearInterval(this.randomWalkInterval);
      this.randomWalkInterval = null;
    }
  }

  // 暫停/繼續
  togglePause() {
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.lastUpdateTime = Date.now();
    }
    return this.isRunning;
  }

  // 重置
  reset() {
    this.stop();
    this.stopRandomWalk();
    this.currentPrice = this.initialPrice;
    this.targetPrice = null;
    this.duration = 0;
    this.elapsed = 0;
    this.isPaused = false;
    this.isRunning = false;

    this.emit('update', {
      price: this.currentPrice,
      targetPrice: null,
      progress: 0,
      elapsed: 0,
      duration: 0,
      isComplete: true,
      isRandomWalk: false,
    });

    // 重置後恢復隨機浮動
    this.startRandomWalk();

    return this.currentPrice;
  }

  // 清理資源
  destroy() {
    this.stop();
    this.stopRandomWalk();
    this.removeAllListeners();
  }
}