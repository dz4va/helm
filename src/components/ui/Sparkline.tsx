import React from 'react';
import { cn } from '@/lib/utils';

// Small single-series daily activity bar chart for a project card - one hue
// (inherits `currentColor`, so it themes via a text-* className on the
// caller), rounded data-ends, and a floor height on zero-value days so the
// baseline never fully disappears. Native <title> per bar stands in for a
// full hover/tooltip layer, appropriate for a decorative micro-chart rather
// than a primary analytics view.
export function Sparkline({
  data,
  labels,
  height = 28,
  className,
}: {
  data: number[];
  labels?: string[];
  height?: number;
  className?: string;
}) {
  const max = Math.max(1, ...data);
  const barWidth = 100 / data.length;

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full text-accent-400', className)}
      style={{ height }}
    >
      {data.map((value, i) => {
        const h = Math.max(2, (value / max) * (height - 4));
        const x = i * barWidth + barWidth * 0.15;
        const w = barWidth * 0.7;
        return (
          <rect
            key={i}
            x={x}
            y={height - h}
            width={w}
            height={h}
            rx={Math.min(1.5, w / 2)}
            fill="currentColor"
            opacity={value > 0 ? 1 : 0.25}
          >
            {labels?.[i] && <title>{`${labels[i]}: ${value}`}</title>}
          </rect>
        );
      })}
    </svg>
  );
}
