import { NextResponse } from 'next/server';
import { db } from '../../../../db/client';
import { tasks, projects, dailyFocus, userProgress, recurringTasks, activity, xpTransactions } from '../../../../db/schema';
import { eq, inArray, isNotNull, desc } from 'drizzle-orm';

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

// Whole-calendar-day difference between two 'YYYY-MM-DD' strings, computed in
// UTC so it's immune to local DST shifts.
function daysBetween(fromDateStr: string, toDateStr: string): number {
  const [fy, fm, fd] = fromDateStr.split('-').map(Number);
  const [ty, tm, td] = toDateStr.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

// Ranks open tasks by priority, then soonest due date, for auto-picking Big 3.
function rankOpenTasksForFocus() {
  const candidates = db.select().from(tasks)
    .where(inArray(tasks.status, ['planned', 'active', 'waiting', 'blocked']))
    .all();

  return candidates.sort((a, b) => {
    const pa = PRIORITY_RANK[a.priority] ?? 4;
    const pb = PRIORITY_RANK[b.priority] ?? 4;
    if (pa !== pb) return pa - pb;
    if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at);
    if (a.due_at) return -1;
    if (b.due_at) return 1;
    return 0;
  });
}

// Materializes today's instance of each active recurring definition into a
// real task once its scheduled trigger time (if any) has arrived. There's no
// background cron in this local-first app, so "automatic" here means
// "created lazily on next visit past the trigger time" rather than at the
// exact clock instant - task id is deterministic (`${recurringId}-${date}`)
// so this is idempotent and safe to run on every request.
function rehydrateRecurringTasks(todayStr: string) {
  const defs = db.select().from(recurringTasks).where(eq(recurringTasks.active, 1)).all();
  if (defs.length === 0) return;

  const now = new Date();
  const dow = now.getDay(); // 0=Sun..6=Sat
  const dayOfMonth = Number(todayStr.split('-')[2]);
  const currentHm = now.toTimeString().slice(0, 5); // 'HH:MM'
  const nowIso = now.toISOString();

  for (const def of defs) {
    if (def.end_date && todayStr > def.end_date) continue;

    if (def.schedule_type === 'weekly') {
      const weekdays: number[] = def.weekdays_json ? JSON.parse(def.weekdays_json) : [];
      if (!weekdays.includes(dow)) continue;
    } else if (def.schedule_type === 'monthly') {
      const monthDays: number[] = def.month_days_json ? JSON.parse(def.month_days_json) : [];
      if (!monthDays.includes(dayOfMonth)) continue;
    }

    // If a trigger time is set, don't materialize until that time of day has arrived.
    if (def.time_of_day && currentHm < def.time_of_day) continue;

    const instanceId = `${def.id}-${todayStr}`;
    const existing = db.select().from(tasks).where(eq(tasks.id, instanceId)).get();
    if (existing) continue;

    db.insert(tasks).values({
      id: instanceId,
      code: instanceId,
      project_id: def.project_id,
      title: def.title,
      description: def.description,
      priority: def.priority,
      effort: def.effort,
      status: 'planned',
      created_at: nowIso,
      updated_at: nowIso,
      recurring_task_id: def.id,
    }).run();

    db.insert(activity).values({
      id: `act-${Date.now()}-${def.id}`,
      entity_type: 'task',
      entity_id: instanceId,
      event_type: 'recurring.added',
      metadata_json: JSON.stringify({ title: def.title, recurringTaskId: def.id }),
      created_at: nowIso,
    }).run();
  }
}

export async function GET() {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    rehydrateRecurringTasks(todayStr);

    // 1. Fetch User Progress (Level & XP)
    const progress = db.select().from(userProgress).where(eq(userProgress.id, 'main')).get() || {
      level: 1,
      total_xp: 0,
      current_streak: 0,
      badges_json: '[]'
    };

    // 2. Fetch Daily Focus (Big 3)
    const focusEntries = db.select().from(dailyFocus).where(eq(dailyFocus.date, todayStr)).all();
    const focusTaskIds = focusEntries.map(f => f.task_id);

    let big3Tasks: any[] = [];
    if (focusTaskIds.length > 0) {
      big3Tasks = db.select().from(tasks).where(inArray(tasks.id, focusTaskIds)).all();
    } else {
      // No Big 3 set for today yet: auto-pick the top 3 by priority/due-date
      // and persist it to daily_focus, so this only happens once per day -
      // a manual change afterward (via set_focus) is never overwritten.
      big3Tasks = rankOpenTasksForFocus().slice(0, 3);
      if (big3Tasks.length > 0) {
        const nowIso = new Date().toISOString();
        big3Tasks.forEach((task, idx) => {
          db.insert(dailyFocus).values({
            id: `focus-${todayStr}-${idx + 1}`,
            date: todayStr,
            task_id: task.id,
            position: idx + 1,
            created_at: nowIso,
          }).run();
        });
      }
    }

    // 3. Fetch Up Next Tasks
    const allActiveTasks = db.select().from(tasks)
      .where(inArray(tasks.status, ['active', 'planned']))
      .all();

    const upNext = allActiveTasks.filter(t => !focusTaskIds.includes(t.id)).slice(0, 5);

    // 4. Calculate Attention Items (overdue / urgent / blocked)
    const urgentTasks = allActiveTasks.filter(t => t.priority === 'urgent' || t.status === 'blocked');

    // 4b. Total open (non-completed, non-archived) task count across all statuses
    const openTaskCount = db.select().from(tasks)
      .where(inArray(tasks.status, ['planned', 'active', 'waiting', 'blocked']))
      .all().length;

    // 5. Fetch Projects List
    const allProjects = db.select().from(projects).all();

    // 5b. Open recurring task instances, surfaced separately on the Now page
    // so they're quick to spot and complete without digging through the full
    // task list. This is deliberately NOT "instances created today" - if the
    // laptop was closed and you only open Helm well after a scheduled trigger
    // time (or the next day), an incomplete instance must still show up
    // rather than silently vanishing at midnight:
    //   - incomplete instances persist indefinitely, regardless of which day
    //     they were created, until you complete them
    //   - completed instances only show if they were both created AND
    //     completed on today's date (a same-day close) - once the calendar
    //     rolls over, a completed instance drops off for good
    // `ageDays` (1 = created today, 2 = one day overdue, ...) lets the UI
    // flag instances that have been sitting open for a while.
    const allRecurringInstances = db.select().from(tasks).where(isNotNull(tasks.recurring_task_id)).all();
    const recurringToday = allRecurringInstances
      .filter((t) => {
        if (t.status !== 'completed') return true;
        const createdDateStr = t.created_at.split('T')[0];
        const completedDateStr = t.completed_at ? t.completed_at.split('T')[0] : null;
        return createdDateStr === todayStr && completedDateStr === todayStr;
      })
      .map((t) => ({
        ...t,
        ageDays: daysBetween(t.created_at.split('T')[0], todayStr) + 1,
      }))
      .sort((a, b) => b.ageDays - a.ageDays);

    // 6. Recent Activity Feed (notification center: completions, XP, recurring adds)
    const recentEvents = db.select().from(activity).orderBy(desc(activity.created_at)).limit(20).all();
    const eventIds = recentEvents.map((e) => e.id);
    const xpByEvent = new Map<string, number>();
    if (eventIds.length > 0) {
      db.select().from(xpTransactions).where(inArray(xpTransactions.source_event_id, eventIds)).all()
        .forEach((xp) => {
          if (xp.source_event_id) xpByEvent.set(xp.source_event_id, xp.amount);
        });
    }
    const recentActivity = recentEvents.map((e) => ({
      ...e,
      metadata: e.metadata_json ? JSON.parse(e.metadata_json) : null,
      xpAmount: xpByEvent.get(e.id) ?? null,
    }));

    return NextResponse.json({
      date: todayStr,
      progress: {
        ...progress,
        badges: JSON.parse(progress.badges_json || '[]')
      },
      big3: big3Tasks,
      upNext,
      attention: urgentTasks,
      openTaskCount,
      projects: allProjects,
      recurringToday,
      recentActivity,
    });
  } catch (error) {
    console.error('Error fetching Helm NOW page data:', error);
    return NextResponse.json({ error: 'Failed to fetch NOW data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, taskIds } = await request.json();

    if (action === 'set_focus') {
      const todayStr = new Date().toISOString().split('T')[0];
      const nowIso = new Date().toISOString();

      // Replace whatever Big 3 is already set for today, if any.
      db.delete(dailyFocus).where(eq(dailyFocus.date, todayStr)).run();

      (taskIds as string[]).slice(0, 3).forEach((taskId, idx) => {
        db.insert(dailyFocus).values({
          id: `focus-${todayStr}-${idx + 1}`,
          date: todayStr,
          task_id: taskId,
          position: idx + 1,
          created_at: nowIso,
        }).run();
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error setting Helm focus:', error);
    return NextResponse.json({ error: 'Failed to set focus' }, { status: 500 });
  }
}
