import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChartTooltip } from './ChartTooltip';

interface TasksPerDayChartProps {
  data: { date: string; count: number }[];
}

export function TasksPerDayChart({ data }: TasksPerDayChartProps) {
  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return <EmptyState label="No completed tasks in this window yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap={2}>
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
          width={24}
        />
        <Tooltip
          cursor={{ fill: '#141414' }}
          content={<ChartTooltip formatValue={(v) => `${v} completed`} />}
        />
        <Bar dataKey="count" fill="#c17f59" radius={[2, 2, 0, 0]} activeBar={{ fill: '#a8674a' }} />
      </BarChart>
    </ResponsiveContainer>
  );
}
