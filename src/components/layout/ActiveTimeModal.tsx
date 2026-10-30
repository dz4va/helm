'use client';

import React, { useEffect, useState } from 'react';
import { X, Clock, Calendar, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatTile } from '@/components/ui/StatTile';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChartTooltip } from '@/components/performance/ChartTooltip';
import { formatDuration } from '@/lib/time';

interface ActiveTimeModalProps {
  open: boolean;
  onClose: () => void;
}

export function ActiveTimeModal({ open, onClose }: ActiveTimeModalProps) {
  const [data, setData] = useState<{ date: string; activeSeconds: number }[] | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/activity-time?days=7')
      .then((res) => res.json())
      .then((json) => setData(json.data || []));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!open) return null;

  const chartData = (data || []).map((d) => ({
    minutes: Math.round(d.activeSeconds / 60),
    label: new Date(`${d.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }),
  }));

  const todaySeconds = data?.[data.length - 1]?.activeSeconds || 0;
  const weekTotal = (data || []).reduce((sum, d) => sum + d.activeSeconds, 0);
  const daysWithActivity = (data || []).filter((d) => d.activeSeconds > 0).length;
  const dailyAvg = daysWithActivity > 0 ? Math.round(weekTotal / daysWithActivity) : 0;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-black/70 backdrop-blur-xl border border-helm-borderStrong rounded-2xl w-full max-w-xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="p-6 border-b border-helm-border flex items-center justify-between bg-accent-500/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent-500 flex items-center justify-center text-white shadow-lg shadow-accent-500/30">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5">Time Tracking</div>
              <div className="text-xl font-semibold text-white">Active Time</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-helm-hover transition-all duration-150 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary tiles */}
          <div className="grid grid-cols-3 gap-3">
            <StatTile icon={Clock} label="Today" value={formatDuration(todaySeconds)} />
            <StatTile icon={Calendar} label="This Week" value={formatDuration(weekTotal)} accentClassName="text-emerald-400" />
            <StatTile icon={TrendingUp} label="Daily Avg" value={formatDuration(dailyAvg)} accentClassName="text-accent-400" />
          </div>

          {/* Weekly bar chart */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Last 7 Days</div>
            {!data ? (
              <div className="text-xs text-zinc-500 py-10 text-center">Loading…</div>
            ) : weekTotal === 0 ? (
              <EmptyState label="No active time recorded yet — check back after using the app today." />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                  <XAxis dataKey="label" stroke="#71717a" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                  <YAxis allowDecimals={false} stroke="#71717a" tick={{ fontSize: 10, fontFamily: 'monospace' }} width={32} />
                  <Tooltip
                    cursor={{ fill: '#141414' }}
                    content={<ChartTooltip formatValue={(v) => formatDuration(Math.round(v * 60))} />}
                  />
                  <Bar dataKey="minutes" fill="#c17f59" radius={[4, 4, 0, 0]} activeBar={{ fill: '#a8674a' }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
