import { useEffect, useRef, useState } from 'react';

interface TradeData {
  date: string;
  pnl: number;
  trades: number;
  winRate: number;
  wins: number;
  losses: number;
}

interface DynamicChartProps {
  data: TradeData[];
  height?: number;
  initialBalance?: number;
  onHover?: (data: TradeData | null) => void;
}

export function generateMockData(): TradeData[] {
  const data: TradeData[] = [];
  let value = 0;
  for (let i = 0; i < 30; i++) {
    const change = (Math.random() - 0.45) * 80;
    value += change;
    if (i < 8) value += 8;
    else if (i < 18) value += 3;
    else value -= 4;
    const pnl = Math.max(-150, Math.min(200, value));
    const date = new Date(2024, 5, i + 1);
    const trades = Math.floor(Math.random() * 5) + 1;
    const winRate = 40 + Math.random() * 40;
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      pnl: Math.round(pnl * 8.5),
      trades: trades,
      winRate: Math.round(winRate),
      wins: Math.round(trades * winRate / 100),
      losses: trades - Math.round(trades * winRate / 100),
    });
  }
  return data;
}

export default function DynamicChart({ data, height = 190, initialBalance = 10000, onHover }: DynamicChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState(-1);

  const chartData = data.length > 0 ? data : generateMockData();

  // 當 hover 變化時通知父組件
  useEffect(() => {
    if (onHover) {
      if (hoveredIndex >= 0 && hoveredIndex < chartData.length) {
        onHover(chartData[hoveredIndex]);
      } else {
        onHover(null);
      }
    }
  }, [hoveredIndex, chartData, onHover]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number, height: number;

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = 1.5;
      width = rect.width * dpr;
      height = rect.height * dpr;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      draw();
    }

    function draw() {
      const w = width;
      const h = height;
      const pad = { top: 20, bottom: 20, left: 55, right: 16 };
      const chartW = w - pad.left - pad.right;
      const chartH = h - pad.top - pad.bottom;

      let cumulative = initialBalance;
      const equityValues = chartData.map(d => {
        cumulative += d.pnl;
        return cumulative;
      });

      const min = Math.min(...equityValues);
      const max = Math.max(...equityValues);
      const range = max - min;
      const padding = range * 0.2 || 500;
      const yMin = Math.floor((min - padding) / 1000) * 1000;
      const yMax = Math.ceil((max + padding) / 1000) * 1000;
      const yRange = yMax - yMin || 1;

      const normalized = equityValues.map(v => (v - yMin) / yRange);
      const points = normalized.map((v, i) => ({
        x: pad.left + (i / (equityValues.length - 1)) * chartW,
        y: pad.top + (1 - v) * chartH,
        value: equityValues[i],
        index: i,
        pnl: chartData[i].pnl,
        trades: chartData[i].trades,
        date: chartData[i].date,
      }));

      const initialY = pad.top + (1 - (initialBalance - yMin) / yRange) * chartH;

      ctx.clearRect(0, 0, w, h);

      // 網格線
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 5]);
      for (let i = 0; i < 4; i++) {
        const y = pad.top + (i / 3) * chartH;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(w - pad.right, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 初始餘額線
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.left, initialY);
      ctx.lineTo(w - pad.right, initialY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('$' + initialBalance.toLocaleString(), pad.left - 6, initialY + 3);

      // 漸變填充
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
      grad.addColorStop(0, 'rgba(72, 217, 169, 0.25)');
      grad.addColorStop(0.4, 'rgba(72, 217, 169, 0.10)');
      grad.addColorStop(0.7, 'rgba(72, 217, 169, 0.04)');
      grad.addColorStop(1, 'rgba(72, 217, 169, 0.01)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, initialY);
      for (let i = 0; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.lineTo(points[points.length - 1].x, initialY);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // 曲線
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = '#48d9a9';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(72, 217, 169, 0.15)';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 數據點
      points.forEach((p, i) => {
        const isHovered = (i === hoveredIndex);
        const radius = isHovered ? 8 : 4;
        const color = p.value >= initialBalance ? '#2bc99a' : '#e8756d';

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
          ctx.fillStyle = p.value >= initialBalance ? 'rgba(43,201,154,0.15)' : 'rgba(232,117,109,0.15)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = isHovered ? (p.value >= initialBalance ? 'rgba(43,201,154,0.5)' : 'rgba(232,117,109,0.5)') : 'transparent';
        ctx.shadowBlur = isHovered ? 16 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.strokeStyle = p.value >= initialBalance ? '#2bc99a' : '#e8756d';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Y軸標籤
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      
      const step = 1000;
      const startVal = Math.floor(yMin / step) * step;
      const endVal = Math.ceil(yMax / step) * step;
      
      for (let val = startVal; val <= endVal; val += step) {
        const pos = (val - yMin) / yRange;
        const y = pad.top + (1 - pos) * chartH;
        if (y >= pad.top - 5 && y <= pad.top + chartH + 5) {
          ctx.fillText('$' + val.toLocaleString(), pad.left - 6, y + 4);
        }
      }

      if (hoveredIndex >= 0 && hoveredIndex < points.length) {
        const p = points[hoveredIndex];
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(p.x, pad.top);
        ctx.lineTo(p.x, pad.top + chartH);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    function getMousePos(e: MouseEvent) {
      const rect = container.getBoundingClientRect();
      const dpr = 1.5;
      return {
        x: (e.clientX - rect.left) * dpr,
        y: (e.clientY - rect.top) * dpr,
      };
    }

    function findNearestPoint(mouseX: number) {
      const rect = container.getBoundingClientRect();
      const dpr = 1.5;
      const pad = { top: 20, bottom: 20, left: 55, right: 16 };
      const chartW = (rect.width * dpr) - pad.left - pad.right;

      let minDist = Infinity;
      let nearest = -1;

      for (let i = 0; i < chartData.length; i++) {
        const x = pad.left + (i / (chartData.length - 1)) * chartW;
        const dist = Math.abs(mouseX - x);
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }

      if (minDist > 40) return -1;
      return nearest;
    }

    const onMouseMove = (e: MouseEvent) => {
      const pos = getMousePos(e);
      const index = findNearestPoint(pos.x);
      setHoveredIndex(index);
      draw();
    };

    const onMouseLeave = () => {
      setHoveredIndex(-1);
      draw();
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);

    const ro = new ResizeObserver(() => {
      resize();
    });
    ro.observe(container);

    resize();

    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      ro.disconnect();
    };
  }, [chartData, hoveredIndex, initialBalance]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: `${height}px` }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}