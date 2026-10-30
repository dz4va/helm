'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, Zap, Flame, Target, CheckCircle2, Clock, Repeat, Briefcase } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AgeBadge } from '@/components/ui/AgeBadge';
import { Sparkline } from '@/components/ui/Sparkline';
import { EmptyState } from '@/components/ui/EmptyState';
import { XpOverTimeChart } from '@/components/performance/XpOverTimeChart';
import { Big3RateChart } from '@/components/performance/Big3RateChart';
import { computeProjectStats, computeAllocation, NOT_ACTIVE_STATUSES } from '@/lib/projectStats';
import { EFFORT_OPTIONS, xpForEffort } from '@/lib/xp';
import { daysSinceCreated } from '@/lib/time';

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [recurringDefs, setRecurringDefs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/now')
      .then((res) => res.json())
      .then(setData);
    fetch('/api/tasks')
      .then((res) => res.json())
      .then((json) => setTasks(json.tasks || []));
    fetch('/api/performance')
      .then((res) => res.json())
      .then(setPerformance);
    fetch('/api/recurring-tasks')
      .then((res) => res.json())
      .then((json) => setRecurringDefs(json.recurringTasks || []));
  }, []);

  const progress = data?.progress || {};
  const projects = data?.projects || [];
  const stats = computeProjectStats(projects, tasks);
  const allocation = computeAllocation(stats);
  const allocationByProjectId = new Map(allocation.map((a) => [a.project.id, a.percent]));

  const completedThisWeekTotal = stats.reduce((sum, s) => sum + s.completedThisWeek, 0);
  const currentStreak = performance?.streak?.currentStreak ?? progress.current_streak ?? 0;

  // Effort & XP breakdown - every completed/archived task, bucketed by its
  // effort tier. XP here is approximate: it's count x the tier's *current*
  // XP value, not necessarily what was actually awarded historically if the
  // task's effort was edited after completion.
  const doneTasks = tasks.filter((t) => t.status === 'completed' || t.status === 'archived');
  const effortCounts = EFFORT_OPTIONS.map((tier) => {
    const count = doneTasks.filter((t) => (t.effort || 'medium') === tier).length;
    return { tier, count, xp: count * xpForEffort(tier) };
  });
  const effortTotal = effortCounts.reduce((sum, e) => sum + e.count, 0);

  // Task staleness - all currently-open tasks bucketed the same way AgeBadge
  // tiers them (1d fresh, 2d aging, 3d+ stale), plus the oldest offenders.
  const openTasks = tasks.filter((t) => !NOT_ACTIVE_STATUSES.has(t.status));
  const openWithAge = openTasks.map((t) => ({ ...t, ageDays: daysSinceCreated(t.created_at) }));
  const freshCount = openWithAge.filter((t) => t.ageDays <= 1).length;
  const agingCount = openWithAge.filter((t) => t.ageDays === 2).length;
  const staleCount = openWithAge.filter((t) => t.ageDays >= 3).length;
  const oldestOpen = [...openWithAge].sort((a, b) => b.ageDays - a.ageDays).slice(0, 5);

  // Recurring adherence - active definitions only, worst completion rate
  // first so what's being neglected surfaces at the top.
  const recurringAdherence = recurringDefs
    .filter((d) => d.active && d.generatedCount > 0)
    .map((d) => ({ ...d, rate: Math.round((d.completedCount / d.generatedCount) * 100) }))
    .sort((a, b) => a.rate - b.rate);

  const goToTask = (taskId: string) => router.push(`/tasks?focus=${encodeURIComponent(taskId)}`);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionHeader
        variant="page"
        icon={BarChart3}
        title="Work OS Analytics"
        subtitle="Execution metrics, effort, staleness, recurring adherence, and project comparison"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatTile icon={Zap} label="Total XP" value={progress.total_xp || 0} hint={`Level ${progress.level || 1} Achieved`} />
        <StatTile
          icon={Flame}
          label="Streak"
          value={`${currentStreak} Days`}
          hint="Active Productivity Streak"
          accentClassName="text-orange-400"
        />
        <StatTile
          icon={Target}
          label="Big 3 Accuracy"
          value={performance ? `${performance.overallBig3Rate}%` : '—'}
          hint="Target Focus Completion"
          accentClassName="text-emerald-400"
        />
        <StatTile
          icon={CheckCircle2}
          label="Completed"
          value={completedThisWeekTotal}
          hint="This Week, All Projects"
          accentClassName="text-emerald-400"
        />
      </div>

      {/* XP & BIG 3 TRENDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="lg">
          <SectionHeader title="XP Earned / Day" />
          {performance ? <XpOverTimeChart data={performance.xpByDay} /> : <EmptyState label="Loading…" />}
        </Card>
        <Card padding="lg">
          <SectionHeader title="Big 3 Completion Rate" />
          {performance ? <Big3RateChart data={performance.big3Rate} /> : <EmptyState label="Loading…" />}
        </Card>
      </div>

      {/* EFFORT & XP BREAKDOWN */}
      <Card padding="lg">
        <SectionHeader title="Effort & XP Breakdown" />
        {effortTotal === 0 ? (
          <EmptyState label="No completed tasks yet." />
        ) : (
          <div className="space-y-3">
            {effortCounts.map(({ tier, count, xp }) => (
              <ProgressBar
                key={tier}
                label={`${tier[0].toUpperCase()}${tier.slice(1)} — ${count} task${count === 1 ? '' : 's'}, ~${xp.toLocaleString()} XP`}
                value={effortTotal > 0 ? (count / effortTotal) * 100 : 0}
              />
            ))}
          </div>
        )}
      </Card>

      {/* TASK STALENESS */}
      <Card padding="lg">
        <SectionHeader icon={Clock} title="Task Staleness" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{freshCount}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Fresh (≤1d)</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-amber-400">{agingCount}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Aging (2d)</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-red-400">{staleCount}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Stale (3d+)</div>
          </div>
        </div>
        {oldestOpen.length === 0 ? (
          <EmptyState label="No open tasks." />
        ) : (
          <div className="space-y-1">
            {oldestOpen.map((task) => (
              <button
                key={task.id}
                onClick={() => goToTask(task.id)}
                className="w-full flex items-center justify-between gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-helm-hover transition-colors duration-150 text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[11px] text-accent-400 flex-shrink-0">{task.code || task.id}</span>
                  <span className="text-zinc-300 truncate">{task.title}</span>
                </div>
                <AgeBadge days={task.ageDays} />
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* RECURRING ADHERENCE */}
      <Card padding="lg">
        <SectionHeader
          icon={Repeat}
          title="Recurring Task Adherence"
          action={
            <Link href="/recurring-tasks" className="text-[11px] text-zinc-500 hover:text-accent-400 transition-colors duration-150">
              Manage
            </Link>
          }
        />
        {recurringAdherence.length === 0 ? (
          <EmptyState label="No active recurring tasks with history yet." />
        ) : (
          <div className="space-y-3">
            {recurringAdherence.map((def) => (
              <ProgressBar
                key={def.id}
                label={`${def.title} — ${def.completedCount}/${def.generatedCount}`}
                value={def.rate}
                tone={def.rate >= 70 ? 'emerald' : def.rate >= 40 ? 'accent' : 'amber'}
              />
            ))}
          </div>
        )}
      </Card>

      {/* CROSS-PROJECT COMPARISON */}
      <Card padding="lg">
        <SectionHeader icon={Briefcase} title="Cross-Project Comparison" />
        {stats.length === 0 ? (
          <EmptyState label="No projects yet." />
        ) : (
          <div className="space-y-3">
            {stats.map(({ project, activeCount, completedThisWeek, activitySeries }) => (
              <div key={project.id} className="grid grid-cols-[1fr_120px] items-center gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] text-zinc-200 truncate">{project.name}</div>
                  <div className="text-[11px] text-zinc-500">
                    {activeCount} open · {completedThisWeek} this week · {allocationByProjectId.get(project.id) ?? 0}% of workload
                  </div>
                </div>
                <Sparkline data={activitySeries} height={24} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
