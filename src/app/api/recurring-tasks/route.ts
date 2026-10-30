import { NextResponse } from 'next/server';
import { db } from '../../../../db/client';
import { recurringTasks, tasks } from '../../../../db/schema';
import { eq, isNotNull } from 'drizzle-orm';

export async function GET() {
  try {
    const defs = db.select().from(recurringTasks).all();

    // Every materialized instance carries recurring_task_id (see
    // rehydrateRecurringTasks in api/now/route.ts) with a deterministic id of
    // `${defId}-${date}` - tally those per definition so the page can show
    // how many times each has actually fired, and how many today.
    const todayStr = new Date().toISOString().split('T')[0];
    const generated = db.select().from(tasks).where(isNotNull(tasks.recurring_task_id)).all();

    const countsByDef = new Map<string, { total: number; completed: number; today: number }>();
    for (const t of generated) {
      const defId = t.recurring_task_id as string;
      const entry = countsByDef.get(defId) || { total: 0, completed: 0, today: 0 };
      entry.total += 1;
      if (t.status === 'completed') entry.completed += 1;
      if (t.created_at.startsWith(todayStr)) entry.today += 1;
      countsByDef.set(defId, entry);
    }

    const defsWithCounts = defs.map((def) => ({
      ...def,
      generatedCount: countsByDef.get(def.id)?.total ?? 0,
      completedCount: countsByDef.get(def.id)?.completed ?? 0,
      generatedTodayCount: countsByDef.get(def.id)?.today ?? 0,
    }));

    return NextResponse.json({ recurringTasks: defsWithCounts });
  } catch (error) {
    console.error('Error fetching recurring tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring tasks' }, { status: 500 });
  }
}

type RecurringPatch = Partial<typeof recurringTasks.$inferInsert>;

// Shared shaping of the schedule_type-dependent fields, used by both create and update.
function scheduleFieldsFromBody(body: any): RecurringPatch {
  const scheduleType = body.scheduleType === 'weekly' || body.scheduleType === 'monthly' ? body.scheduleType : 'daily';
  return {
    schedule_type: scheduleType,
    weekdays_json: scheduleType === 'weekly' && Array.isArray(body.weekdays) ? JSON.stringify(body.weekdays) : null,
    month_days_json: scheduleType === 'monthly' && Array.isArray(body.monthDays) ? JSON.stringify(body.monthDays) : null,
    time_of_day: body.timeOfDay || null,
    end_date: body.endDate || null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, title, description, projectId, priority, effort } = body;
    const nowIso = new Date().toISOString();

    if (action === 'create') {
      const newId = `rec-${Date.now()}`;
      db.insert(recurringTasks).values({
        id: newId,
        project_id: projectId || null,
        title,
        description: description || null,
        priority: priority || 'medium',
        effort: effort || 'medium',
        active: 1,
        created_at: nowIso,
        updated_at: nowIso,
        ...scheduleFieldsFromBody(body),
      }).run();

      return NextResponse.json({ success: true, recurringTaskId: newId });
    }

    if (action === 'update') {
      const existing = db.select().from(recurringTasks).where(eq(recurringTasks.id, id)).get();
      if (!existing) return NextResponse.json({ error: 'Recurring task not found' }, { status: 404 });

      const patch: RecurringPatch = { updated_at: nowIso, ...scheduleFieldsFromBody(body) };
      if (title !== undefined) patch.title = title;
      if (description !== undefined) patch.description = description || null;
      if (projectId !== undefined) patch.project_id = projectId || null;
      if (priority !== undefined) patch.priority = priority;
      if (effort !== undefined) patch.effort = effort;

      db.update(recurringTasks).set(patch).where(eq(recurringTasks.id, id)).run();
      return NextResponse.json({ success: true });
    }

    if (action === 'toggle_active') {
      const existing = db.select().from(recurringTasks).where(eq(recurringTasks.id, id)).get();
      if (!existing) return NextResponse.json({ error: 'Recurring task not found' }, { status: 404 });

      db.update(recurringTasks)
        .set({ active: existing.active ? 0 : 1, updated_at: nowIso })
        .where(eq(recurringTasks.id, id))
        .run();
      return NextResponse.json({ success: true, active: existing.active ? 0 : 1 });
    }

    if (action === 'delete') {
      db.delete(recurringTasks).where(eq(recurringTasks.id, id)).run();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error modifying recurring task:', error);
    return NextResponse.json({ error: 'Failed to modify recurring task' }, { status: 500 });
  }
}
