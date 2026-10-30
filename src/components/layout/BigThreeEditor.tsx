'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Circle, GripVertical, Search, X } from 'lucide-react';
import { cn, fuzzyMatch } from '@/lib/utils';
import { Badge, toneForPriority } from '@/components/ui/Badge';
import { AgeBadge } from '@/components/ui/AgeBadge';
import { daysSinceCreated } from '@/lib/time';

function formatDueDate(dueAt: string) {
  const dueStr = dueAt.split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = dueStr < todayStr;
  const label = new Date(dueStr + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return { label, isOverdue };
}

type Props = {
  open: boolean;
  onClose: () => void;
  big3Ids: string[];
  onDropTask: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
};

const PRIORITY_ACCENT: Record<string, string> = {
  urgent: 'border-l-red-500 bg-red-500/5 hover:border-red-500/60',
  high: 'border-l-amber-500 bg-amber-500/5 hover:border-amber-500/60',
  medium: 'border-l-accent-500 bg-accent-500/5 hover:border-accent-500/60',
  low: 'border-l-zinc-600 bg-zinc-700/10 hover:border-zinc-500/60',
};

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_OPTIONS = ['urgent', 'high', 'medium', 'low'] as const;
const PRIORITY_CHIP_ACTIVE: Record<string, string> = {
  urgent: 'bg-red-500/20 border-red-500/50 text-red-300',
  high: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
  medium: 'bg-accent-500/20 border-accent-500/50 text-accent-300',
  low: 'bg-zinc-700/40 border-zinc-500/50 text-zinc-200',
};

export function BigThreeEditor({ open, onClose, big3Ids, onDropTask, onToggleComplete }: Props) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setCompletingIds(new Set());
    fetch('/api/tasks')
      .then((res) => res.json())
      .then((data) => {
        setTasks(data.tasks || []);
        setProjects(data.projects || []);
      })
      .catch((e) => console.error(e));
  }, [open]);

  const handleComplete = (taskId: string) => {
    setCompletingIds((prev) => new Set(prev).add(taskId));
    onToggleComplete(taskId);
  };

  const poolTasks = useMemo(() => {
    return tasks
      .filter((t) => !['completed', 'cancelled', 'archived'].includes(t.status))
      .filter((t) => !big3Ids.includes(t.id))
      .filter((t) => !completingIds.has(t.id))
      .filter((t) => projectFilter === 'all' || t.project_id === projectFilter)
      .filter((t) => priorityFilter === 'all' || t.priority === priorityFilter)
      .filter((t) => fuzzyMatch(`${t.code || t.id} ${t.title}`, search))
      .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4));
  }, [tasks, big3Ids, completingIds, projectFilter, priorityFilter, search]);

  if (!open) return null;

  return (
    <div
      data-big3-editor-panel
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) onDropTask(taskId);
      }}
      className={cn(
        'fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[min(96vw,80rem)]',
        'bg-white/5 backdrop-blur-2xl border rounded-2xl shadow-2xl shadow-black/60 p-5',
        'animate-in fade-in slide-in-from-bottom-2 duration-200',
        dragOver ? 'border-accent-500/60 ring-1 ring-accent-500/40' : 'border-helm-borderStrong'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] font-medium uppercase tracking-wider text-zinc-400">
          All Tasks — Drag into Big 3, or drop here to remove
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 transition-colors duration-150">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="w-full bg-black/20 border border-helm-border rounded-lg pl-8 pr-3 py-1.5 text-[13px] text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-accent-500/50"
        />
      </div>

      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setProjectFilter('all')}
          className={cn(
            'px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap transition-colors duration-150',
            projectFilter === 'all'
              ? 'bg-accent-500/15 border-accent-500/40 text-accent-300'
              : 'border-helm-border text-zinc-400 hover:text-zinc-200'
          )}
        >
          All Projects
        </button>
        {projects.map((p: any) => (
          <button
            key={p.id}
            onClick={() => setProjectFilter(p.id)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap transition-colors duration-150',
              projectFilter === p.id
                ? 'bg-accent-500/15 border-accent-500/40 text-accent-300'
                : 'border-helm-border text-zinc-400 hover:text-zinc-200'
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setPriorityFilter('all')}
          className={cn(
            'px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap transition-colors duration-150',
            priorityFilter === 'all'
              ? 'bg-accent-500/15 border-accent-500/40 text-accent-300'
              : 'border-helm-border text-zinc-400 hover:text-zinc-200'
          )}
        >
          All Priorities
        </button>
        {PRIORITY_OPTIONS.map((p) => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap capitalize transition-colors duration-150',
              priorityFilter === p
                ? PRIORITY_CHIP_ACTIVE[p]
                : 'border-helm-border text-zinc-400 hover:text-zinc-200'
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex items-stretch gap-3 overflow-x-auto pb-1 min-h-[104px] max-h-[220px]">
        {poolTasks.length === 0 ? (
          <div className="text-[13px] text-zinc-500 py-3 px-1">No tasks match this filter.</div>
        ) : (
          poolTasks.map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
              className={cn(
                'flex-shrink-0 w-64 p-3 border border-l-4 border-helm-borderStrong rounded-lg cursor-grab active:cursor-grabbing transition-colors duration-150',
                PRIORITY_ACCENT[task.priority] || PRIORITY_ACCENT.low
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <GripVertical className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                  <span className="font-mono text-[11px] text-accent-400">{task.code || task.id}</span>
                </div>
                <Badge tone={toneForPriority(task.priority)}>{task.priority}</Badge>
              </div>
              <div className="flex items-start gap-2 mb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleComplete(task.id);
                  }}
                  className="mt-0.5 flex-shrink-0 text-zinc-500 hover:text-emerald-400 transition-colors duration-150"
                  title="Mark complete"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <div className="text-[13px] text-zinc-200 leading-snug line-clamp-2">{task.title}</div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <AgeBadge days={daysSinceCreated(task.created_at)} />
                {task.due_at && (
                  <span
                    className={cn(
                      'flex items-center gap-1 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border flex-shrink-0',
                      formatDueDate(task.due_at).isOverdue
                        ? 'bg-red-500/15 text-red-400 border-red-500/30'
                        : 'bg-zinc-700/20 text-zinc-400 border-zinc-600/40'
                    )}
                    title={formatDueDate(task.due_at).isOverdue ? 'Overdue' : 'Due date'}
                  >
                    <Calendar className="w-2.5 h-2.5" />
                    {formatDueDate(task.due_at).label}
                  </span>
                )}
                {task.effort && (
                  <span className="text-[9px] font-medium text-zinc-500 capitalize px-1.5 py-0.5">
                    {task.effort} effort
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
