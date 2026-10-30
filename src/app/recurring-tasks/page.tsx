'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Repeat, Plus, Pencil, Trash2, Pause, Play, Infinity as InfinityIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge, toneForPriority } from '@/components/ui/Badge';
import { TimeSelect } from '@/components/ui/TimeSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import { cn } from '@/lib/utils';
import { EFFORT_OPTIONS, xpForEffort } from '@/lib/xp';

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SCHEDULE_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Specific weekdays' },
  { value: 'monthly', label: 'Specific month days' },
] as const;
type ScheduleType = (typeof SCHEDULE_TYPES)[number]['value'];

type RecurringTask = {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  effort: string;
  schedule_type: ScheduleType;
  weekdays_json: string | null;
  month_days_json: string | null;
  time_of_day: string | null;
  end_date: string | null;
  active: number;
  generatedCount: number;
  completedCount: number;
  generatedTodayCount: number;
};

type FormState = {
  title: string;
  description: string;
  projectId: string;
  priority: string;
  effort: string;
  scheduleType: ScheduleType;
  weekdays: number[];
  monthDays: string; // raw comma-separated input, e.g. "1, 15"
  timeOfDay: string;
  noEndDate: boolean;
  endDate: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  projectId: '',
  priority: 'medium',
  effort: 'medium',
  scheduleType: 'daily',
  weekdays: [1, 2, 3, 4, 5],
  monthDays: '',
  timeOfDay: '',
  noEndDate: true,
  endDate: '',
};

function scheduleSummary(def: RecurringTask): string {
  let base: string;
  if (def.schedule_type === 'weekly') {
    const days: number[] = def.weekdays_json ? JSON.parse(def.weekdays_json) : [];
    base = days.length ? `Weekly: ${days.map((d) => WEEKDAY_LABELS[d]).join(', ')}` : 'Weekly';
  } else if (def.schedule_type === 'monthly') {
    const days: number[] = def.month_days_json ? JSON.parse(def.month_days_json) : [];
    base = days.length ? `Monthly: ${days.map((d) => `${d}${ordinalSuffix(d)}`).join(', ')}` : 'Monthly';
  } else {
    base = 'Daily';
  }
  if (def.time_of_day) base += ` at ${def.time_of_day}`;
  return base;
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function formFromDef(def: RecurringTask): FormState {
  return {
    title: def.title,
    description: def.description || '',
    projectId: def.project_id || '',
    priority: def.priority,
    effort: def.effort || 'medium',
    scheduleType: def.schedule_type,
    weekdays: def.weekdays_json ? JSON.parse(def.weekdays_json) : [1, 2, 3, 4, 5],
    monthDays: def.month_days_json ? JSON.parse(def.month_days_json).join(', ') : '',
    timeOfDay: def.time_of_day || '',
    noEndDate: !def.end_date,
    endDate: def.end_date || '',
  };
}

export default function RecurringTasksPage() {
  const [defs, setDefs] = useState<RecurringTask[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [recRes, nowRes] = await Promise.all([
        fetch('/api/recurring-tasks'),
        fetch('/api/now'),
      ]);
      const recData = await recRes.json();
      const nowData = await nowRes.json();
      setDefs(recData.recurringTasks || []);
      setProjects(nowData.projects || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, projectId: projects[0]?.id || '' });
    setModalOpen(true);
  };

  const openEdit = (def: RecurringTask) => {
    setEditingId(def.id);
    setForm(formFromDef(def));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const toggleWeekday = (d: number) => {
    setForm((f) => ({
      ...f,
      weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d].sort(),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const monthDays = form.monthDays
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31);

      const payload = {
        action: editingId ? 'update' : 'create',
        id: editingId || undefined,
        title: form.title,
        description: form.description || null,
        projectId: form.projectId || null,
        priority: form.priority,
        effort: form.effort,
        scheduleType: form.scheduleType,
        weekdays: form.scheduleType === 'weekly' ? form.weekdays : undefined,
        monthDays: form.scheduleType === 'monthly' ? monthDays : undefined,
        timeOfDay: form.timeOfDay || null,
        endDate: form.noEndDate ? null : form.endDate || null,
      };

      await fetch('/api/recurring-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      closeModal();
      fetchAll();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (def: RecurringTask) => {
    try {
      await fetch('/api/recurring-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_active', id: def.id }),
      });
      fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteDef = async (def: RecurringTask) => {
    if (!confirm(`Delete recurring task "${def.title}"? Already-created tasks from it will stay in your task list.`)) return;
    try {
      await fetch('/api/recurring-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: def.id }),
      });
      fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  const projectName = useMemo(() => {
    const map = new Map(projects.map((p) => [p.id, p.name]));
    return (id: string | null) => (id ? map.get(id) || id : '—');
  }, [projects]);

  const totalGeneratedToday = useMemo(
    () => defs.reduce((sum, d) => sum + d.generatedTodayCount, 0),
    [defs]
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-helm-border pb-4">
        <SectionHeader
          variant="page"
          icon={Repeat}
          title="Recurring Tasks"
          subtitle="Schedules that auto-add tasks to your list and notify you when due"
        />
        <div className="flex items-center gap-3">
          {!loading && defs.length > 0 && (
            <div className="text-xs text-zinc-400">
              <span className="text-accent-400 font-semibold">{totalGeneratedToday}</span> generated today
            </div>
          )}
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-600 hover:bg-accent-500 text-white text-xs font-medium rounded transition-all duration-150 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            New Recurring Task
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-zinc-500 py-12 text-center">Loading recurring tasks...</div>
      ) : defs.length === 0 ? (
        <Card padding="lg" className="text-center text-xs text-zinc-500">
          No recurring tasks yet. Create one to have it auto-added to your task list on schedule.
        </Card>
      ) : (
        <Card padding="sm" className="!p-0 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-helm-bg border-b border-helm-border text-zinc-400 font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Effort</th>
                <th className="py-3 px-4">Schedule</th>
                <th className="py-3 px-4">Ends</th>
                <th className="py-3 px-4">Generated</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-helm-border">
              {defs.map((def) => (
                <tr key={def.id} className="hover:bg-helm-hover transition-colors duration-150">
                  <td className={cn('py-3 px-4 text-[13px]', !def.active && 'text-zinc-500')}>{def.title}</td>
                  <td className="py-3 px-4 text-zinc-400">{projectName(def.project_id)}</td>
                  <td className="py-3 px-4">
                    <Badge tone={toneForPriority(def.priority)}>{def.priority}</Badge>
                  </td>
                  <td className="py-3 px-4 text-zinc-400 capitalize">
                    {def.effort} <span className="text-zinc-600">· {xpForEffort(def.effort)}xp</span>
                  </td>
                  <td className="py-3 px-4 text-zinc-300">{scheduleSummary(def)}</td>
                  <td className="py-3 px-4 text-zinc-400">
                    {def.end_date ? (
                      def.end_date
                    ) : (
                      <span className="inline-flex items-center gap-1 text-zinc-500">
                        <InfinityIcon className="w-3.5 h-3.5" /> No end date
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-200 font-medium">{def.generatedCount}</span>
                      <span>total</span>
                      {def.completedCount > 0 && <span className="text-emerald-400">· {def.completedCount} done</span>}
                      {def.generatedTodayCount > 0 && (
                        <Badge tone="info" className="ml-1">+{def.generatedTodayCount} today</Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge tone={def.active ? 'good' : 'neutral'}>{def.active ? 'active' : 'paused'}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleActive(def)}
                        title={def.active ? 'Pause' : 'Resume'}
                        className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-helm-hover transition-colors duration-150 active:scale-95"
                      >
                        {def.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => openEdit(def)}
                        title="Edit"
                        className="p-1.5 rounded text-zinc-400 hover:text-accent-400 hover:bg-helm-hover transition-colors duration-150 active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteDef(def)}
                        title="Delete"
                        className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-helm-hover transition-colors duration-150 active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-black/80 backdrop-blur-xl border border-helm-borderStrong rounded-lg w-full max-w-lg p-4 shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Repeat className="w-4 h-4 text-accent-400" />
                {editingId ? 'Edit Recurring Task' : 'New Recurring Task'}
              </h3>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-200 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Title (e.g. Write up DSU notes)"
                autoFocus
                required
                className="w-full bg-helm-bg border border-helm-borderStrong rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30"
              />

              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)"
                rows={2}
                className="w-full bg-helm-bg border border-helm-borderStrong rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 resize-none"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                  className="bg-helm-bg border border-helm-borderStrong rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  className="bg-helm-bg border border-helm-borderStrong rounded px-3 py-2 text-xs text-zinc-200 capitalize focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p} className="capitalize">{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                  Effort (how much work this actually takes — drives XP)
                </label>
                <select
                  value={form.effort}
                  onChange={(e) => setForm((f) => ({ ...f, effort: e.target.value }))}
                  className="w-full bg-helm-bg border border-helm-borderStrong rounded px-3 py-2 text-xs text-zinc-200 capitalize focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30"
                >
                  {EFFORT_OPTIONS.map((eff) => (
                    <option key={eff} value={eff} className="capitalize">{eff} — {xpForEffort(eff)} XP</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 border-t border-helm-border pt-3">
                <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Schedule
                </div>

                <div className="flex items-center bg-helm-bg border border-helm-border rounded p-1 text-xs w-fit">
                  {SCHEDULE_TYPES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, scheduleType: opt.value }))}
                      className={cn(
                        'px-2.5 py-1 rounded font-medium transition-all duration-150 active:scale-95',
                        form.scheduleType === opt.value ? 'bg-accent-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {form.scheduleType === 'weekly' && (
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAY_LABELS.map((label, idx) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleWeekday(idx)}
                        className={cn(
                          'px-2.5 py-1 rounded text-[11px] font-medium border transition-all duration-150 active:scale-95',
                          form.weekdays.includes(idx)
                            ? 'bg-accent-500/20 text-accent-400 border-accent-500/30'
                            : 'bg-helm-bg text-zinc-400 border-helm-border hover:text-zinc-200'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {form.scheduleType === 'monthly' && (
                  <input
                    type="text"
                    value={form.monthDays}
                    onChange={(e) => setForm((f) => ({ ...f, monthDays: e.target.value }))}
                    placeholder="Day(s) of month, e.g. 1, 15"
                    className="w-full bg-helm-bg border border-helm-border rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30"
                  />
                )}

                <div className="grid grid-cols-2 gap-3 items-start">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                      Trigger time (optional)
                    </label>
                    <TimeSelect
                      value={form.timeOfDay}
                      onChange={(v) => setForm((f) => ({ ...f, timeOfDay: v }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">End date</label>
                    <DatePicker
                      value={form.endDate}
                      disabled={form.noEndDate}
                      placeholder="No end date"
                      onChange={(v) => setForm((f) => ({ ...f, endDate: v }))}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <input
                    type="checkbox"
                    checked={form.noEndDate}
                    onChange={(e) => setForm((f) => ({ ...f, noEndDate: e.target.checked, endDate: e.target.checked ? '' : f.endDate }))}
                    className="accent-accent-500"
                  />
                  No end date (repeats forever)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1.5 bg-accent-600 hover:bg-accent-500 text-white text-xs font-medium rounded transition-all duration-150 active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
