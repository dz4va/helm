'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCircle2, Repeat, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dispatchOpenStatsModal } from '@/lib/xpEvents';

const LAST_SEEN_KEY = 'helm:notifications:lastSeenAt';
const CLEARED_AT_KEY = 'helm:notifications:clearedAt';
const NOTIFIED_IDS_KEY = 'helm:notifications:browserNotifiedIds';
const POLL_INTERVAL_MS = 60_000;
const MAX_NOTIFIED_IDS = 200;

type ActivityEvent = {
  id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  created_at: string;
  metadata: { title?: string; priority?: string; recurringTaskId?: string } | null;
  xpAmount: number | null;
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function loadNotifiedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_IDS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveNotifiedIds(ids: Set<string>) {
  const arr = Array.from(ids).slice(-MAX_NOTIFIED_IDS);
  localStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(arr));
}

// Mounted once in the root layout header so recurring-task reminders can fire
// (via the browser Notification API) no matter which page is open, not just
// while sitting on the Now page. Polls /api/now, whose GET handler already
// materializes due recurring tasks server-side on every call - this component
// just watches the resulting `recurring.added` activity events for ones it
// hasn't shown a browser notification for yet. Only fires while this tab is
// open; there's no background/OS-level delivery in this local-first app.
export function NotificationCenter({ activity: initialActivity }: { activity?: ActivityEvent[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string>('');
  const [clearedAt, setClearedAt] = useState<string>('');
  const [activity, setActivity] = useState<ActivityEvent[]>(initialActivity || []);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLastSeenAt(localStorage.getItem(LAST_SEEN_KEY) || '');
    setClearedAt(localStorage.getItem(CLEARED_AT_KEY) || '');
    notifiedIdsRef.current = loadNotifiedIds();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch('/api/now');
        const data = await res.json();
        if (cancelled) return;
        const events: ActivityEvent[] = data.recentActivity || [];
        setActivity(events);

        const recurringEvents = events.filter((e) => e.event_type === 'recurring.added');
        if (recurringEvents.length === 0) return;

        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          Notification.requestPermission();
        }

        const notified = notifiedIdsRef.current;
        let changed = false;
        for (const e of recurringEvents) {
          if (notified.has(e.id)) continue;
          notified.add(e.id);
          changed = true;
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Recurring task added', { body: e.metadata?.title || e.entity_id });
          }
        }
        if (changed) saveNotifiedIds(notified);
      } catch (err) {
        console.error(err);
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // `activity` mirrors the canonical event log (see HELM.md data ownership
  // rules) - "clearing" only hides already-seen entries from this dropdown
  // via a localStorage cutoff, it never deletes rows from the activity table.
  const visibleActivity = useMemo(
    () => activity.filter((e) => !clearedAt || e.created_at > clearedAt),
    [activity, clearedAt]
  );

  const unseenCount = useMemo(
    () => visibleActivity.filter((e) => !lastSeenAt || e.created_at > lastSeenAt).length,
    [visibleActivity, lastSeenAt]
  );

  const toggleOpen = () => {
    setOpen((v) => !v);
    if (!open && activity[0]) {
      localStorage.setItem(LAST_SEEN_KEY, activity[0].created_at);
      setLastSeenAt(activity[0].created_at);
    }
  };

  const clearAll = () => {
    const cutoff = activity[0]?.created_at || new Date().toISOString();
    localStorage.setItem(CLEARED_AT_KEY, cutoff);
    localStorage.setItem(LAST_SEEN_KEY, cutoff);
    setClearedAt(cutoff);
    setLastSeenAt(cutoff);
  };

  // Task-related events (completions, recurring adds) jump to that task on
  // the Tasks page; anything else (e.g. a future level/XP-only event) opens
  // the Level/Stats modal instead, since there's nowhere else for it to go.
  const handleItemClick = (e: ActivityEvent) => {
    setOpen(false);
    if (e.entity_type === 'task') {
      router.push(`/tasks?focus=${encodeURIComponent(e.entity_id)}`);
    } else {
      dispatchOpenStatsModal();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="relative flex items-center gap-1.5 text-xs text-zinc-500 hover:text-accent-400 font-mono transition-all duration-150 active:scale-95"
        title="Notifications"
      >
        <Bell className="w-3.5 h-3.5" />
        {unseenCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-accent-500 text-white text-[8px] font-bold flex items-center justify-center">
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={cn(
              'absolute right-0 top-8 z-50 w-80 max-h-96 overflow-y-auto',
              'bg-[#0b0d11] border border-helm-borderStrong rounded-xl shadow-2xl shadow-black/60 p-2',
              'animate-in fade-in slide-in-from-top-2 duration-150'
            )}
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Activity</span>
              {visibleActivity.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors duration-150"
                  title="Clear notifications"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
            {visibleActivity.length === 0 ? (
              <div className="text-[12px] text-zinc-500 px-2 py-3">No activity yet.</div>
            ) : (
              <div className="space-y-1">
                {visibleActivity.map((e) => {
                  const isCompletion = e.event_type === 'task.completed';
                  const isRecurring = e.event_type === 'recurring.added';
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => handleItemClick(e)}
                      className="w-full flex items-start gap-2 px-2 py-1.5 rounded hover:bg-helm-hover transition-colors duration-150 text-left"
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {isCompletion ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : isRecurring ? (
                          <Repeat className="w-3.5 h-3.5 text-accent-400" />
                        ) : (
                          <Zap className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] text-zinc-200 truncate">
                          {isRecurring && <span className="text-accent-400">Recurring task added — </span>}
                          {e.metadata?.title || e.entity_id}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                          <span>{timeAgo(e.created_at)}</span>
                          {e.xpAmount && (
                            <span className="text-emerald-400 font-semibold">+{e.xpAmount} XP</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
