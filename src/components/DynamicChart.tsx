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
}

export default function DynamicChart({ data, height = 190 }: DynamicChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState(-1);

  // 如果沒有數據，生成模擬數據
  const chartData = data.length > 0 ? data : generateMockData();

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const tooltip = tooltipRef.current;
    if (!container || !canvas || !tooltip) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number, height: number;
    let animationId: number | null = null;

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
      const pad = { top: 20, bottom: 20, left: 30, right: 16 };
      const chartW = w - pad.left - pad.right;
      const chartH = h - pad.top - pad.bottom;

      const values = chartData.map(d => d.pnl);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;

      const normalized = values.map(v => (v - min) / range);
      const points = normalized.map((v, i) => ({
        x: pad.left + (i / (values.length - 1)) * chartW,
        y: pad.top + (1 - v) * chartH,
        value: values[i],
        index: i
      }));

      const zeroY = pad.top + (1 - (0 - min) / range) * chartH;

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

      // 零線
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(w - pad.right, zeroY);
      ctx.stroke();

      // 漸變填充
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
      grad.addColorStop(0, 'rgba(72, 217, 169, 0.3)');
      grad.addColorStop(0.4, 'rgba(72, 217, 169, 0.12)');
      grad.addColorStop(0.7, 'rgba(72, 217, 169, 0.04)');
      grad.addColorStop(1, 'rgba(72, 217, 169, 0.01)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, zeroY);
      for (let i = 0; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.lineTo(points[points.length - 1].x, zeroY);
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
        const color = p.value >= 0 ? '#2bc99a' : '#e8756d';

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
          ctx.fillStyle = p.value >= 0 ? 'rgba(43,201,154,0.15)' : 'rgba(232,117,109,0.15)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = isHovered ? (p.value >= 0 ? 'rgba(43,201,154,0.5)' : 'rgba(232,117,109,0.5)') : 'transparent';
        ctx.shadowBlur = isHovered ? 16 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isHovered) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.strokeStyle = p.value >= 0 ? '#2bc99a' : '#e8756d';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Y軸標籤
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      const yLabels = ['+$2k', '+$1k', '$0', '-$1k'];
      const yPositions = [0, 0.33, 0.66, 1];
      yPositions.forEach((pos, i) => {
        const y = pad.top + pos * chartH;
        ctx.fillText(yLabels[i], pad.left - 6, y + 3);
      });

      // 懸浮線
      if (hoveredIndex >= 0 && hoveredIndex < points.length) {
        const p = points[hoveredIndex];
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
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
      const pad = { top: 20, bottom: 20, left: 30, right: 16 };
      const chartW = (rect.width * dpr) - pad.left - pad.right;
      const values = chartData.map(d => d.pnl);

      let minDist = Infinity;
      let nearest = -1;

      for (let i = 0; i < values.length; i++) {
        const x = pad.left + (i / (values.length - 1)) * chartW;
        const dist = Math.abs(mouseX - x);
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }

      if (minDist > 50) return -1;
      return nearest;
    }

    function updateTooltip(index: number) {
      const rect = container.getBoundingClientRect();
      const dpr = 1.5;
      const pad = { top: 20, bottom: 20, left: 30, right: 16 };
      const chartW = (rect.width * dpr) - pad.left - pad.right;

      if (index < 0 || index >= chartData.length) {
        tooltip.classList.remove('visible');
        return;
      }

      const data = chartData[index];
      const pnl = data.pnl;
      const x = pad.left + (index / (chartData.length - 1)) * chartW;
      const pixelX = x / dpr + rect.left;

      tooltip.querySelector('.date')!.textContent = data.date;

      const valueEl = tooltip.querySelector('.value')!;
      valueEl.textContent = (pnl >= 0 ? '+' : '-') + '$' + Math.abs(pnl).toLocaleString();
      valueEl.className = 'value ' + (pnl >= 0 ? 'green' : 'red');

      const pnlEl = tooltip.querySelector('.pnl-value')!;
      pnlEl.textContent = (pnl >= 0 ? '+' : '-') + '$' + Math.abs(pnl).toLocaleString();
      pnlEl.className = 'pnl-value ' + (pnl >= 0 ? 'green' : 'red');

      tooltip.querySelector('.trades-value')!.textContent = String(data.trades);

      const tooltipW = tooltip.offsetWidth || 200;
      let left = pixelX - tooltipW / 2;
      if (left < 10) left = 10;
      if (left + tooltipW > window.innerWidth - 10) left = window.innerWidth - tooltipW - 10;

      tooltip.style.left = left + 'px';
      tooltip.style.top = (rect.top - 10) + 'px';
      tooltip.classList.add('visible');
    }

    const onMouseMove = (e: MouseEvent) => {
      const pos = getMousePos(e);
      const index = findNearestPoint(pos.x);
      setHoveredIndex(index);
      draw();
      updateTooltip(index);
    };

    const onMouseLeave = () => {
      setHoveredIndex(-1);
      draw();
      tooltip.classList.remove('visible');
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
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [chartData, hoveredIndex]);

  return (
    <div style={{ position: 'relative', width: '100%', height: `${height}px` }} ref={containerRef}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          background: '#1a232e',
          border: '1px solid #2a3540',
          borderRadius: '10px',
          padding: '14px 18px',
          minWidth: '180px',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.15s ease',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          zIndex: 100,
        }}
        className="tooltip"
      >
        <div className="date" style={{ color: '#788795', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>June 24, 2024</div>
        <div className="value green" style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0' }}>+$1,245</div>
        <div className="detail" style={{ color: '#b7c3cd', fontSize: '12px', display: 'flex', gap: '14px', marginTop: '4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="dot green" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#2bc99a' }}></span>
            P&L: <strong className="pnl-value green" style={{ fontWeight: 600 }}>+$1,245</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="dot blue" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#4fc3f7' }}></span>
            Trades: <strong className="trades-value" style={{ fontWeight: 600 }}>3</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

// 生成模擬數據
function generateMockData(): TradeData[] {
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