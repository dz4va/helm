import React from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChartTooltip } from './ChartTooltip';

interface Big3RateChartProps {
  data: { date: string; total: number; completed: number; rate: number }[];
}

export function Big3RateChart({ data }: Big3RateChartProps) {
  if (data.length === 0) {
    return <EmptyState label="No Big 3 focus history in this window yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          stroke="#71717a"
          tick={{ fontSize: 10, fontFamily: 'monospace' }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          stroke="#71717a"
          tick={{ fontSize: 10, fontFamily: 'monospace' }}
          width={28}
        />
        <Tooltip content={<ChartTooltip formatValue={(v) => `${v}%`} />} />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="#c17f59"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#c17f59' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
