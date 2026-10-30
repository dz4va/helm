'use client';

import React, { useEffect, useState } from 'react';
import { Activity, BarChart3, Flame } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ToggleChip } from '@/components/ui/ToggleChip';
import { TasksPerDayChart } from './TasksPerDayChart';
import { StreakHeatmap } from './StreakHeatmap';

const STORAGE_KEY = 'helm:performance:visibleCharts';
const CHART_IDS = ['tasks', 'streak'] as const;
type ChartId = (typeof CHART_IDS)[number];

const CHART_LABELS: Record<ChartId, string> = {
  tasks: 'Tasks/Day',
  streak: 'Streak',
};

interface PerformanceData {
  dailyCompletions: { date: string; count: number }[];
  streak: { currentStreak: number; longestStreakInRange: number };
}

function loadVisible(): ChartId[] {
  if (typeof window === 'undefined') return [...CHART_IDS];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...CHART_IDS];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((id) => CHART_IDS.includes(id));
  } catch {
    // fall through to default
  }
  return [...CHART_IDS];
}

// XP/Day and Big 3 Rate live on /analytics now, alongside the newer
// effort/recurring/staleness/cross-project sections - this stays a quick
// glance on the Now page, not the full performance deep-dive.
export function PerformanceSection() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [visible, setVisible] = useState<ChartId[]>([...CHART_IDS]);

  useEffect(() => {
    setVisible(loadVisible());
    fetch('/api/performance')
      .then((res) => res.json())
      .then(setData)
      .catch((e) => console.error(e));
  }, []);

  const toggle = (id: ChartId) => {
    setVisible((prev) => {
      const next = prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const isVisible = (id: ChartId) => visible.includes(id);

  return (
    <Card padding="lg">
      <SectionHeader
        icon={BarChart3}
        title="Performance"
        action={
          <div className="flex items-center gap-1.5">
            <ToggleChip active={isVisible('tasks')} onClick={() => toggle('tasks')} label={CHART_LABELS.tasks} icon={BarChart3} />
            <ToggleChip active={isVisible('streak')} onClick={() => toggle('streak')} label={CHART_LABELS.streak} icon={Flame} />
          </div>
        }
      />

      {!data ? (
        <div className="text-xs text-zinc-500 py-3 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          Loading performance data…
        </div>
      ) : visible.length === 0 ? (
        <div className="text-xs text-zinc-500 py-3 text-center">All charts hidden — toggle one above.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isVisible('tasks') && (
            <Card padding="sm" className="!bg-helm-hover">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-helm-muted mb-2">
                Tasks Completed / Day
              </div>
              <TasksPerDayChart data={data.dailyCompletions.slice(-14)} />
            </Card>
          )}
          {isVisible('streak') && (
            <Card padding="sm" className="!bg-helm-hover">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-helm-muted mb-2">
                Activity Streak
              </div>
              <StreakHeatmap
                data={data.dailyCompletions}
                currentStreak={data.streak.currentStreak}
                longestStreakInRange={data.streak.longestStreakInRange}
              />
            </Card>
          )}
        </div>
      )}
    </Card>
  );
}
