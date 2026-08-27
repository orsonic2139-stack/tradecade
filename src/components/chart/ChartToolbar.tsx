import { useEffect, useState } from 'react';
import {
  Crosshair,
  TrendingUp,
  Minus,
  MoveVertical,
  ArrowUpRight,
  Square,
  Ruler,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Camera,
  MousePointer2,
  Slash,
} from 'lucide-react';
import type { ChartType } from '@/types';

export type DrawingTool =
  | 'cursor'
  | 'crosshair'
  | 'trendline'
  | 'horizontal'
  | 'vertical'
  | 'ray'
  | 'rectangle'
  | 'fibonacci'
  | 'measure'
  | 'zoomin'
  | 'zoomout'
  | 'reset'
  | 'screenshot';

interface ToolDef {
  id: DrawingTool;
  icon: typeof Crosshair;
  label: string;
  shortcut?: string;
  separator?: boolean;
}

const TOOLS: ToolDef[] = [
  { id: 'cursor', icon: MousePointer2, label: 'Cursor', shortcut: 'V' },
  { id: 'crosshair', icon: Crosshair, label: 'Crosshair', shortcut: 'C' },
  { id: 'trendline', icon: TrendingUp, label: 'Trend Line', shortcut: 'T' },
  { id: 'horizontal', icon: Minus, label: 'Horizontal Line', shortcut: 'H' },
  { id: 'vertical', icon: MoveVertical, label: 'Vertical Line', shortcut: 'Shift+V' },
  { id: 'ray', icon: ArrowUpRight, label: 'Ray', shortcut: 'R' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'Shift+R' },
  { id: 'fibonacci', icon: Slash, label: 'Fibonacci Retracement', shortcut: 'F' },
  { id: 'measure', icon: Ruler, label: 'Measure', shortcut: 'M' },
  { id: 'zoomin', icon: ZoomIn, label: 'Zoom In' },
  { id: 'zoomout', icon: ZoomOut, label: 'Zoom Out' },
  { id: 'reset', icon: RotateCcw, label: 'Reset Chart' },
  { id: 'screenshot', icon: Camera, label: 'Screenshot' },
];

interface ChartToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onScreenshot: () => void;
}

export function ChartToolbar({
  activeTool,
  onToolChange,
  chartType,
  onChartTypeChange,
  onZoomIn,
  onZoomOut,
  onReset,
  onScreenshot,
}: ChartToolbarProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return;
      const key = e.key.toLowerCase();
      const map: Record<string, DrawingTool> = {
        v: 'cursor',
        c: 'crosshair',
        t: 'trendline',
        h: 'horizontal',
        r: e.shiftKey ? 'rectangle' : 'ray',
        f: 'fibonacci',
        m: 'measure',
      };
      if (map[key] && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onToolChange(map[key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToolChange]);

  const handleClick = (tool: DrawingTool) => {
    switch (tool) {
      case 'zoomin':
        onZoomIn();
        break;
      case 'zoomout':
        onZoomOut();
        break;
      case 'reset':
        onReset();
        break;
      case 'screenshot':
        onScreenshot();
        break;
      default:
        onToolChange(tool);
    }
  };

  return (
    <div className="flex items-center gap-1 px-2 h-9 bg-bg-panel border-b border-border no-select">
      {/* Chart type selector */}
      <div className="flex items-center gap-0.5 mr-2 pr-2 border-r border-border">
        {(['candles', 'bars', 'line', 'area'] as ChartType[]).map((t) => (
          <button
            key={t}
            onClick={() => onChartTypeChange(t)}
            className={`px-2 py-1 text-xs rounded transition-colors capitalize ${
              chartType === t
                ? 'bg-gold/15 text-gold'
                : 'text-txt-muted hover:bg-bg-hover hover:text-txt-secondary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Drawing tools */}
      <div className="flex items-center gap-0.5">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <div
              key={tool.id}
              className="tooltip-wrapper"
              onMouseEnter={() => setHovered(tool.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <button
                onClick={() => handleClick(tool.id)}
                className={`p-1.5 rounded transition-all duration-150 ${
                  isActive
                    ? 'bg-gold/15 text-gold'
                    : 'text-txt-muted hover:bg-bg-hover hover:text-txt-secondary'
                }`}
              >
                <Icon size={15} strokeWidth={1.75} />
              </button>
              {hovered === tool.id && (
                <div className="tooltip-content">
                  {tool.label}
                  {tool.shortcut && (
                    <span className="text-txt-faint ml-1.5 font-mono">
                      {tool.shortcut}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
