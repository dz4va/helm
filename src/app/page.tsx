'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Target,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  Pencil,
  GripVertical,
  Repeat,
  ChevronDown,
  ChevronRight,
  ListTodo,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge, toneForPriority } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { AgeBadge } from '@/components/ui/AgeBadge';
import { PerformanceSection } from '@/components/performance/PerformanceSection';
import { ActiveTimeModal } from '@/components/layout/ActiveTimeModal';
import { useActiveTime } from '@/components/layout/ActiveTimeContext';
import { BigThreeEditor } from '@/components/layout/BigThreeEditor';
import { formatDuration, daysSinceCreated } from '@/lib/time';
import { dispatchXpGained } from '@/lib/xpEvents';
import { xpForEffort, ageXpMultiplier } from '@/lib/xp';
import { cn } from '@/lib/utils';

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const DISMISSED_KEY_PREFIX = 'helm:checkin:dismissed:';

function todayDismissedKey() {
  return DISMISSED_KEY_PREFIX + new Date().toISOString().split('T')[0];
}
const PRIORITY_ACCENT_BORDER: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-amber-500',
  medium: 'border-l-accent-500',
  low: 'border-l-zinc-600',
};
const USER_NAME = process.env.NEXT_PUBLIC_USER_NAME || 'there';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function NowPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const { activeSeconds } = useActiveTime();
  const [activeTimeModalOpen, setActiveTimeModalOpen] = useState(false);
  const [big3EditorOpen, setBig3EditorOpen] = useState(false);
  const [big3DragOver, setBig3DragOver] = useState(false);
  const [needsAttentionOpen, setNeedsAttentionOpen] = useState(false);
  const big3CardRef = useRef<HTMLDivElement>(null);

  // The editor panel is a fixed-position overlay above the dock, so it can
  // cover the Big 3 drop zone on shorter viewports — nudge the page down
  // just enough to keep both visible once the panel has actually painted.
  useEffect(() => {
    if (!big3EditorOpen) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const cardEl = big3CardRef.current;
        const panelEl = document.querySelector('[data-big3-editor-panel]') as HTMLElement | null;
        if (!cardEl || !panelEl) return;
        const cardRect = cardEl.getBoundingClientRect();
        const panelRect = panelEl.getBoundingClientRect();
        const overlap = cardRect.bottom - panelRect.top;
        if (overlap > 0) {
          window.scrollBy({ top: overlap + 24, behavior: 'smooth' });
        }
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [big3EditorOpen]);

  const fetchNowData = async () => {
    try {
      const res = await fetch('/api/now');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNowData();
  }, []);

  // Cmd+E on Mac, Ctrl+E on Windows/Linux, toggles the Big 3 editor.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setBig3EditorOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dismissed check-in items are keyed by date, so they persist across a
  // reload/refetch but naturally reset the next day without any cleanup.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(todayDismissedKey()) || '[]');
      setDismissedIds(new Set(stored));
    } catch {
      // ignore malformed/missing localStorage value
    }
  }, []);

  const toggleTask = async (taskId: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_complete', taskId })
      });
      const json = await res.json();
      if (json.status === 'completed' && json.xpAwarded) {
        dispatchXpGained({ amount: json.xpAwarded, newLevel: json.newLevel });
      }
      fetchNowData();
    } catch (e) {
      console.error(e);
    }
  };

  const setFocus = async (taskIds: string[]) => {
    try {
      await fetch('/api/now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_focus', taskIds })
      });
      fetchNowData();
    } catch (e) {
      console.error(e);
    }
  };

  const activeBig3Ids = () =>
    (data?.big3 || []).filter((t: any) => t.status !== 'completed').map((t: any) => t.id);

  const addToBig3 = (taskId: string) => {
    const currentIds = activeBig3Ids();
    if (currentIds.includes(taskId) || currentIds.length >= 3) return;
    setFocus([...currentIds, taskId]);
  };

  const removeFromBig3 = (taskId: string) => {
    const currentIds = activeBig3Ids();
    setFocus(currentIds.filter((id: string) => id !== taskId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        Loading Helm Control Center...
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }).toUpperCase();

  const big3 = (data?.big3 || []).filter((t: any) => t.status !== 'completed');
  const upNext = data?.upNext || [];
  const attention = data?.attention || [];
  const recurringToday = data?.recurringToday || [];

  // Single deduped "Needs Your Attention" list: real urgent/blocked items
  // first (never dismissible - they're genuine blockers), then the top
  // priority items from Up Next as a softer check-in nudge (dismissible).
  // Up Next already excludes Big 3 server-side, but not attention items, so
  // that overlap is filtered out here.
  const attentionIds = new Set(attention.map((t: any) => t.id));
  const checkInFillers = [...upNext]
    .filter((t: any) => !attentionIds.has(t.id) && !dismissedIds.has(t.id))
    .sort((a: any, b: any) => (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4))
    .slice(0, 4);
  const needsAttention = [...attention, ...checkInFillers];
  const needsAttentionIds = new Set(needsAttention.map((t: any) => t.id));

  // Whatever's left in the queue after the items already surfaced above.
  const remainingUpNext = upNext.filter((t: any) => !needsAttentionIds.has(t.id));

  const dismissCheckIn = (taskId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev).add(taskId);
      localStorage.setItem(todayDismissedKey(), JSON.stringify(Array.from(next)));
      return next;
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Date & Greeting Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono tracking-wider text-zinc-500">{todayStr}</div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100 mt-0.5">{getGreeting()}, {USER_NAME}</h1>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <Link
            href="/tasks"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-accent-400 font-mono transition-all duration-150 active:scale-95"
            title="Open (non-completed) tasks across all projects"
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>{data?.openTaskCount ?? 0} open</span>
          </Link>
          <button
            onClick={() => setActiveTimeModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-accent-400 font-mono transition-all duration-150 active:scale-95"
            title="View active time log"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Active {formatDuration(activeSeconds)}</span>
          </button>
        </div>
      </div>

      <ActiveTimeModal open={activeTimeModalOpen} onClose={() => setActiveTimeModalOpen(false)} />

      {/* BIG 3 FOCUS */}
      <Card
        ref={big3CardRef}
        padding="lg"
        onDragOver={(e: React.DragEvent) => {
          if (!big3EditorOpen) return;
          e.preventDefault();
          setBig3DragOver(true);
        }}
        onDragLeave={() => setBig3DragOver(false)}
        onDrop={(e: React.DragEvent) => {
          if (!big3EditorOpen) return;
          e.preventDefault();
          setBig3DragOver(false);
          const taskId = e.dataTransfer.getData('text/plain');
          if (taskId) addToBig3(taskId);
        }}
        className={cn(
          'transition-colors duration-150',
          big3EditorOpen && 'border-dashed border-accent-500/40',
          big3DragOver && 'border-solid border-accent-500/70 ring-2 ring-accent-500/40 bg-accent-500/5'
        )}
      >
        <SectionHeader
          icon={Target}
          title="Big 3 Focus (Today's Priorities)"
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Max 3 Items</span>
              <button
                onClick={() => setBig3EditorOpen((v) => !v)}
                title="Toggle Big 3 editor (⌘E / Ctrl+E)"
                className={cn(
                  'flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors duration-150',
                  big3EditorOpen
                    ? 'bg-accent-500/15 text-accent-300'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-helm-hover'
                )}
              >
                <Pencil className="w-3 h-3" />
                {big3EditorOpen ? 'Done Editing' : 'Edit Big 3'}
                <span className="text-xs text-zinc-400 font-mono ml-0.5">⌘E</span>
              </button>
            </div>
          }
        />

        <div className="space-y-2.5">
          {big3.length === 0 ? (
            <EmptyState label="No Big 3 tasks set for today." />
          ) : (
            big3.map((task: any) => {
              const isDone = task.status === 'completed';
              return (
                <div
                  key={task.id}
                  draggable={big3EditorOpen}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                  onClick={() => !big3EditorOpen && toggleTask(task.id)}
                  className={cn(
                    'p-3 rounded border border-l-4 flex items-center justify-between transition-colors duration-150',
                    big3EditorOpen ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                    isDone
                      ? 'bg-helm-bg border-helm-border border-l-helm-border text-zinc-500 line-through'
                      : cn(
                          'bg-helm-hover border-helm-borderStrong text-zinc-200 hover:border-accent-500/50',
                          PRIORITY_ACCENT_BORDER[task.priority] || PRIORITY_ACCENT_BORDER.low
                        )
                  )}
                >
                  <div className="flex items-center gap-3">
                    {big3EditorOpen && <GripVertical className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />}
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-accent-400 flex-shrink-0" />
                    )}
                    <span className="font-mono text-xs text-accent-400 font-semibold">{task.code || task.id}</span>
                    <span className="text-[13px]">{task.title}</span>
                    {!isDone && <AgeBadge days={daysSinceCreated(task.created_at)} />}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge tone={toneForPriority(task.priority)}>{task.priority}</Badge>
                    {big3EditorOpen && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromBig3(task.id);
                        }}
                        className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:bg-red-500/15 hover:text-red-400 transition-colors duration-150"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <BigThreeEditor
        open={big3EditorOpen}
        onClose={() => setBig3EditorOpen(false)}
        big3Ids={big3.map((t: any) => t.id)}
        onDropTask={removeFromBig3}
        onToggleComplete={toggleTask}
      />

      {/* RECURRING & UP NEXT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Repeat className="w-3 h-3 text-accent-400" />
              Recurring
              <span className="normal-case text-zinc-600">· as of {todayStr}</span>
            </div>
            <Link href="/recurring-tasks" className="text-[11px] text-zinc-500 hover:text-accent-400 transition-colors duration-150">
              Manage
            </Link>
          </div>
          {recurringToday.length === 0 ? (
            <div className="text-[13px] text-zinc-500 py-1.5">No open recurring tasks.</div>
          ) : (
            <div className="space-y-1.5">
              {recurringToday.map((task: any) => {
                const isDone = task.status === 'completed';
                const xp = Math.round(xpForEffort(task.effort) * ageXpMultiplier(task.ageDays));
                return (
                  <div key={task.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {!isDone && <AgeBadge days={task.ageDays} />}
                      <span className={cn('text-[13px] truncate', isDone ? 'text-zinc-500 line-through' : 'text-zinc-300')}>
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn('text-[10px] font-semibold', isDone ? 'text-emerald-400' : 'text-zinc-500')}>
                        {isDone ? `+${xp} XP` : `+${xp} XP on completion`}
                      </span>
                      <button
                        onClick={() => toggleTask(task.id)}
                        title={isDone ? 'Mark incomplete' : 'Mark complete'}
                        aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                        className={cn(
                          'w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors duration-150',
                          isDone ? 'text-emerald-400 hover:bg-emerald-500/15' : 'text-zinc-500 hover:bg-emerald-500/15 hover:text-emerald-400'
                        )}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card padding="lg">
          <SectionHeader title="Up Next" />
          <div className="space-y-2">
            {remainingUpNext.length === 0 ? (
              <EmptyState label="Nothing else queued." />
            ) : (
              remainingUpNext.map((task: any) => (
                <div
                  key={task.id}
                  className="p-2.5 bg-helm-hover border border-helm-borderStrong rounded flex items-center justify-between text-[13px] hover:border-accent-500/40 transition-colors duration-150"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-accent-400">{task.code || task.id}</span>
                    <span className="text-zinc-300 truncate max-w-[200px]">{task.title}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase">{task.priority}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* NEEDS YOUR ATTENTION — merged, deduped: real urgent/blocked items
          (non-dismissible, completable) plus a softer priority-ranked
          check-in nudge (dismissible), so no task shows up twice. Collapsed
          by default so this isn't the mode the page defaults into. */}
      <Card padding="lg" className="!p-0">
        <button
          onClick={() => setNeedsAttentionOpen((v) => !v)}
          className="w-full text-left p-5 hover:bg-helm-hover transition-colors duration-150 rounded-lg"
        >
          <SectionHeader
            icon={AlertTriangle}
            title="Needs Your Attention"
            tone={attention.length > 0 ? 'warning' : 'default'}
            className="mb-0"
            action={
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                {needsAttentionOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                {needsAttentionOpen ? 'Collapse' : needsAttention.length === 0 ? "You're clear" : `${needsAttention.length} item${needsAttention.length === 1 ? '' : 's'}`}
              </span>
            }
          />
        </button>
        <div className={cn('px-5', needsAttentionOpen ? 'pb-5' : 'pb-0')}>
        {needsAttentionOpen && (
          needsAttention.length === 0 ? (
            <EmptyState label="Nothing needs your attention — you're clear." />
          ) : (
            <div className="space-y-1.5">
              {needsAttention.map((task: any) => {
                const isBlocking = attentionIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded px-2.5 py-2 text-[13px] transition-colors duration-150',
                      isBlocking ? 'bg-amber-500/10 border border-amber-500/20' : 'hover:bg-helm-hover'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn('font-mono text-[11px] flex-shrink-0', isBlocking ? 'font-bold text-amber-400' : 'text-accent-400')}>
                        {task.code || task.id}
                      </span>
                      <span className={cn('truncate', isBlocking ? 'text-amber-100' : 'text-zinc-300')}>{task.title}</span>
                      <AgeBadge days={daysSinceCreated(task.created_at)} />
                      <Badge tone={isBlocking ? 'warning' : toneForPriority(task.priority)} className="flex-shrink-0">
                        {task.status === 'blocked' ? 'blocked' : task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleTask(task.id)}
                        title="Mark complete"
                        aria-label="Mark complete"
                        className="w-6 h-6 rounded flex items-center justify-center text-emerald-400 hover:bg-emerald-500/15 transition-colors duration-150"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      {!isBlocking && (
                        <button
                          onClick={() => dismissCheckIn(task.id)}
                          title="Not yet — dismiss for now"
                          aria-label="Dismiss"
                          className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:bg-red-500/15 hover:text-red-400 transition-colors duration-150"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
        </div>
      </Card>

      {/* PERFORMANCE */}
      <PerformanceSection />
    </div>
  );
}
