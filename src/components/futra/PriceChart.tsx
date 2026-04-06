import { useMemo } from 'react';

interface PriceChartProps {
  className?: string;
  points?: number[];
}

function generatePoints(count = 20): number[] {
  const pts: number[] = [30 + Math.random() * 20];
  for (let i = 1; i < count; i++) {
    const delta = (Math.random() - 0.4) * 12;
    pts.push(Math.max(5, Math.min(95, pts[i - 1] + delta)));
  }
  return pts;
}

export function PriceChart({ className = '', points }: PriceChartProps) {
  const data = useMemo(() => points ?? generatePoints(), [points]);

  const width = 200;
  const height = 48;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pathPoints = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return { x, y };
  });

  let d = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
  for (let i = 1; i < pathPoints.length; i++) {
    const prev = pathPoints[i - 1];
    const curr = pathPoints[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const fillD = `${d} L ${pathPoints[pathPoints.length - 1].x} ${height} L ${pathPoints[0].x} ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--chart-green))" stopOpacity="0.15" />
          <stop offset="100%" stopColor="hsl(var(--chart-green))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#chartFill)" />
      <path
        d={d}
        fill="none"
        stroke="hsl(var(--chart-green))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
