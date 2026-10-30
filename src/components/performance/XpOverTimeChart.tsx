import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChartTooltip } from './ChartTooltip';

interface XpOverTimeChartProps {
  data: { date: string; amount: number }[];
}

export function XpOverTimeChart({ data }: XpOverTimeChartProps) {
  const hasData = data.some((d) => d.amount > 0);

  if (!hasData) {
    return <EmptyState label="No XP earned in this window yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c17f59" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#c17f59" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          stroke="#71717a"
          tick={{ fontSize: 10, fontFamily: 'monospace' }}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          stroke="#71717a"
          tick={{ fontSize: 10, fontFamily: 'monospace' }}
          width={28}
        />
        <Tooltip content={<ChartTooltip formatValue={(v) => `+${v} XP`} />} />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#c17f59"
          strokeWidth={2}
          fill="url(#xpGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
