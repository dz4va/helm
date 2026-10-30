'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Archive, CheckSquare, Filter, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge, toneForPriority } from '@/components/ui/Badge';
import { AgeBadge } from '@/components/ui/AgeBadge';
import { cn } from '@/lib/utils';
import { dispatchXpGained } from '@/lib/xpEvents';
import { EFFORT_OPTIONS, xpForEffort, ageXpMultiplier } from '@/lib/xp';
import { daysSinceCreated } from '@/lib/time';

const STATUS_OPTIONS = ['backlog', 'planned', 'active', 'waiting', 'blocked', 'completed', 'cancelled', 'archived'] as const;
const STATUS_TEXT_TONE: Record<string, string> = {
  backlog: 'text-zinc-400',
  planned: 'text-zinc-200',
  active: 'text-accent-400',
  waiting: 'text-amber-400',
  blocked: 'text-red-400',
  completed: 'text-emerald-400',
  cancelled: 'text-zinc-500',
  archived: 'text-zinc-600',
};
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'status', label: 'Status' },
  { value: 'created', label: 'Recently Created' },
] as const;
type SortBy = (typeof SORT_OPTIONS)[number]['value'];

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="text-xs text-zinc-500 py-12 text-center">Loading tasks...</div>}>
      <TasksPageContent />
    </Suspense>
  );
}

function TasksPageContent() {
  const searchParams = useSearchParams();
  const focusTaskId = searchParams.get('focus');

  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'focus' | 'all' | 'board'>('focus');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('priority');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const appliedFocusRef = useRef(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
      setProjects(data.projects || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Deep-link support for notification-center clicks (?focus=<taskId>): clear
  // any filters that would hide the task, scroll it into view, and briefly
  // highlight it.
  useEffect(() => {
    if (!focusTaskId || appliedFocusRef.current || tasks.length === 0) return;
    if (!tasks.some((t) => t.id === focusTaskId)) return;
    appliedFocusRef.current = true;

    setActiveTab('all');
    setFilterProject('all');
    setFilterStatus('all');
    setSearchQuery('');
    setHighlightId(focusTaskId);

    const scrollTimer = setTimeout(() => {
      rowRefs.current[focusTaskId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    const clearTimer = setTimeout(() => setHighlightId(null), 3000);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [focusTaskId, tasks]);

  const updateStatus = async (taskId: string, status: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_task', taskId, status })
      });
      const json = await res.json();
      if (json.xpAwarded) {
        dispatchXpGained({ amount: json.xpAwarded, newLevel: json.newLevel });
      }
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const updateEffort = async (taskId: string, effort: string) => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_task', taskId, effort })
      });
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const cleanUpAndArchive = async () => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive_completed' })
      });
      fetchTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const filteredTasks = tasks
    .filter((task) => {
      // Archived tasks are kept out of the default "All Statuses" view so
      // they don't clutter day-to-day work; dig them up via the status filter.
      if (filterStatus === 'all' && task.status === 'archived') return false;
      if (filterProject !== 'all' && task.project_id !== filterProject) return false;
      if (filterStatus !== 'all' && task.status !== filterStatus) return false;
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && !task.code?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        return (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4);
      }
      if (sortBy === 'dueDate') {
        if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at);
        if (a.due_at) return -1;
        if (b.due_at) return 1;
        return 0;
      }
      if (sortBy === 'status') {
        return STATUS_OPTIONS.indexOf(a.status) - STATUS_OPTIONS.indexOf(b.status);
      }
      // created: most recent first
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

  const activeTasks = filteredTasks.filter(t => t.status !== 'completed' && t.status !== 'archived');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Tabs */}
      <div className="flex justify-between items-center border-b border-helm-border pb-4">
        <SectionHeader
          variant="page"
          icon={CheckSquare}
          title="Task Management"
          subtitle="SQLite Canonical Task Operational Registry"
        />

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-helm-card border border-helm-border rounded p-1 text-xs">
          {(['focus', 'all', 'board'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1 rounded capitalize font-medium transition-all duration-150 active:scale-95',
                activeTab === tab
                  ? 'bg-accent-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <Card padding="sm" className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="bg-helm-bg border border-helm-border rounded pl-8 pr-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 w-56"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="bg-helm-bg border border-helm-border rounded px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-helm-bg border border-helm-border rounded px-3 py-1.5 text-zinc-200 text-xs capitalize focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30"
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="bg-helm-bg border border-helm-border rounded px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>Sort: {opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {completedCount > 0 && (
            <button
              onClick={cleanUpAndArchive}
              title="Move all completed tasks to Archived status"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-helm-border text-zinc-400 hover:text-zinc-200 hover:border-accent-500/50 transition-colors duration-150 active:scale-95 text-xs"
            >
              <Archive className="w-3.5 h-3.5" />
              Clean Up & Archive ({completedCount})
            </button>
          )}
          <span className="text-zinc-400 text-xs">
            Showing {filteredTasks.length} tasks ({activeTasks.length} active)
          </span>
        </div>
      </Card>

      {/* View Content */}
      {loading ? (
        <div className="text-xs text-zinc-500 py-12 text-center">Loading tasks from SQLite...</div>
      ) : activeTab === 'all' || activeTab === 'focus' ? (
        <Card padding="sm" className="!p-0 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-helm-bg border-b border-helm-border text-zinc-400 font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Task Title</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Effort</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-helm-border">
              {filteredTasks.map((task) => {
                const isDone = task.status === 'completed' || task.status === 'archived';
                return (
                  <tr
                    key={task.id}
                    ref={(el) => { rowRefs.current[task.id] = el; }}
                    className={cn(
                      'hover:bg-helm-hover transition-colors duration-500',
                      highlightId === task.id && 'bg-accent-500/10 ring-1 ring-inset ring-accent-500/50'
                    )}
                  >
                    <td className="py-2 px-4">
                      <select
                        value={task.status}
                        onChange={(e) => updateStatus(task.id, e.target.value)}
                        className={cn(
                          'bg-helm-bg border border-helm-border rounded px-2 py-1 text-[11px] capitalize focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30',
                          STATUS_TEXT_TONE[task.status]
                        )}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} className="capitalize">{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-accent-400">{task.code || task.id}</td>
                    <td className={cn('py-3 px-4 text-[13px]', isDone ? 'line-through text-zinc-500' : 'text-zinc-200')}>
                      <span className="inline-flex items-center gap-1.5">
                        {task.title}
                        {!isDone && <AgeBadge days={daysSinceCreated(task.created_at)} />}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 capitalize">{task.project_id}</td>
                    <td className="py-3 px-4">
                      <Badge tone={toneForPriority(task.priority)}>{task.priority}</Badge>
                    </td>
                    <td className="py-2 px-4">
                      <select
                        value={task.effort || 'medium'}
                        onChange={(e) => updateEffort(task.id, e.target.value)}
                        title={`${Math.round(xpForEffort(task.effort || 'medium') * ageXpMultiplier(daysSinceCreated(task.created_at)))} XP on completion (${xpForEffort(task.effort || 'medium')} base)`}
                        className="bg-helm-bg border border-helm-border rounded px-2 py-1 text-[11px] text-zinc-300 capitalize focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30"
                      >
                        {EFFORT_OPTIONS.map((eff) => (
                          <option key={eff} value={eff} className="capitalize">{eff} · {xpForEffort(eff)}xp</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        /* Board View */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {STATUS_OPTIONS.map((colStatus) => {
            const colTasks = filteredTasks.filter(t => t.status === colStatus);
            return (
              <Card key={colStatus} padding="sm" className="space-y-3">
                <div className="flex justify-between items-center text-[11px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-helm-border pb-2">
                  <span>{colStatus}</span>
                  <span className="bg-helm-hover px-2 py-0.5 rounded text-[10px]">{colTasks.length}</span>
                </div>

                <div className="space-y-2">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 bg-helm-hover border border-helm-borderStrong rounded text-xs space-y-1.5"
                    >
                      <div className="flex justify-between items-center font-mono text-[10px] text-accent-400">
                        <span>{t.code || t.id}</span>
                        <span className="uppercase text-[9px] text-zinc-400">{t.priority}</span>
                      </div>
                      <div className="text-zinc-200 text-[13px]">{t.title}</div>
                      <select
                        value={t.status}
                        onChange={(e) => updateStatus(t.id, e.target.value)}
                        className={cn(
                          'w-full bg-helm-bg border border-helm-border rounded px-2 py-1 text-[10px] capitalize focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30',
                          STATUS_TEXT_TONE[t.status]
                        )}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} className="capitalize">{s}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
