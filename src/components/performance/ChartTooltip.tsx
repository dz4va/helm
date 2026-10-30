import React from 'react';

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ value: number; name?: string; color?: string }>;
  formatValue?: (value: number) => string;
}

export function ChartTooltip({ active, label, payload, formatValue }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-helm-card border border-helm-borderStrong rounded px-2.5 py-1.5 text-xs shadow-lg">
      <div className="text-zinc-400 font-mono text-[10px] mb-0.5">{label}</div>
      {payload.map((entry, idx) => (
        <div key={idx} className="text-zinc-200 font-semibold">
          {formatValue ? formatValue(entry.value) : entry.value}
        </div>
      ))}
    </div>
  );
}
