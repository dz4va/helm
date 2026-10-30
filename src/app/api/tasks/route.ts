import { NextResponse } from 'next/server';
import { db } from '../../../../db/client';
import { tasks, projects, activity, userProgress, xpTransactions } from '../../../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { xpForTask } from '@/lib/xp';

export async function GET() {
  try {
    const allTasks = db.select().from(tasks).all();
    const allProjects = db.select().from(projects).all();
    
    return NextResponse.json({
      tasks: allTasks,
      projects: allProjects
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// Shared side effects for any path that transitions a task into 'completed'
// (toggle_complete or update_task setting status: 'completed'): logs the
// activity event and awards XP/level, so behavior is identical either way.
function awardCompletionXp(taskId: string, existing: { priority: string; effort: string; title: string; created_at: string }, nowIso: string) {
  const activityId = `act-${Date.now()}`;
  db.insert(activity).values({
    id: activityId,
    entity_type: 'task',
    entity_id: taskId,
    event_type: 'task.completed',
    metadata_json: JSON.stringify({ priority: existing.priority, effort: existing.effort, title: existing.title }),
    created_at: nowIso,
  }).run();

  const xpAmount = xpForTask(existing.effort, existing.created_at, nowIso);
  db.insert(xpTransactions).values({
    id: `xp-${Date.now()}`,
    source_event_id: activityId,
    amount: xpAmount,
    reason: `Completed task ${taskId}`,
    created_at: nowIso,
  }).run();

  let newLevel: number | undefined;
  const currentProgress = db.select().from(userProgress).where(eq(userProgress.id, 'main')).get();
  if (currentProgress) {
    const newXP = currentProgress.total_xp + xpAmount;
    newLevel = Math.floor(Math.pow(newXP / 100, 1 / 2.2)) + 1;
    db.update(userProgress).set({
      total_xp: newXP,
      level: newLevel,
      updated_at: nowIso,
    }).where(eq(userProgress.id, 'main')).run();
  }

  return { xpAmount, newLevel };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, taskId, title, projectId, priority, effort, code, description, dueAt, status } = body;

    if (action === 'toggle_complete') {
      const existing = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
      if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

      const newStatus = existing.status === 'completed' ? 'active' : 'completed';
      const nowIso = new Date().toISOString();

      db.update(tasks)
        .set({
          status: newStatus,
          completed_at: newStatus === 'completed' ? nowIso : null,
          updated_at: nowIso,
        })
        .where(eq(tasks.id, taskId))
        .run();

      let xpAwarded: number | undefined;
      let newLevel: number | undefined;
      if (newStatus === 'completed') {
        const result = awardCompletionXp(taskId, existing, nowIso);
        xpAwarded = result.xpAmount;
        newLevel = result.newLevel;
      }

      return NextResponse.json({ success: true, status: newStatus, xpAwarded, newLevel });
    }

    if (action === 'create_task') {
      const nowIso = new Date().toISOString();
      const resolvedProjectId = projectId || 'general';

      // Allow callers to pass an explicit code (e.g. for backfills); otherwise
      // auto-generate the next Jira-style code from the project's own counter
      // (e.g. "WRK-42"), falling back to a generic id for projects with no
      // code_prefix configured (e.g. "general").
      let newId = code;
      if (!newId) {
        const project = db.select().from(projects).where(eq(projects.id, resolvedProjectId)).get();
        if (project?.code_prefix) {
          newId = `${project.code_prefix}-${project.next_seq}`;
          db.update(projects)
            .set({ next_seq: project.next_seq + 1 })
            .where(eq(projects.id, resolvedProjectId))
            .run();
        } else {
          newId = `TASK-${Date.now().toString().slice(-4)}`;
        }
      }

      db.insert(tasks).values({
        id: newId,
        code: newId,
        project_id: resolvedProjectId,
        title: title || 'New Task',
        description: description || null,
        priority: priority || 'medium',
        effort: effort || 'medium',
        due_at: dueAt || null,
        status: 'planned',
        created_at: nowIso,
        updated_at: nowIso,
      }).run();

      return NextResponse.json({ success: true, taskId: newId });
    }

    if (action === 'update_task') {
      const existing = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
      if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

      const nowIso = new Date().toISOString();
      const patch: Partial<typeof tasks.$inferInsert> = { updated_at: nowIso };
      if (dueAt !== undefined) patch.due_at = dueAt;
      if (priority !== undefined) patch.priority = priority;
      if (effort !== undefined) patch.effort = effort;
      if (description !== undefined) patch.description = description;
      if (title !== undefined) patch.title = title;

      const isNewlyCompleted = status !== undefined && status !== existing.status && status === 'completed';
      if (status !== undefined && status !== existing.status) {
        patch.status = status;
        // Keep completed_at consistent with status regardless of which UI
        // control changed it (dropdown here vs. the quick toggle_complete).
        patch.completed_at = status === 'completed' ? nowIso : null;
      }

      db.update(tasks).set(patch).where(eq(tasks.id, taskId)).run();

      let xpAwarded: number | undefined;
      let newLevel: number | undefined;
      if (isNewlyCompleted) {
        const result = awardCompletionXp(taskId, existing, nowIso);
        xpAwarded = result.xpAmount;
        newLevel = result.newLevel;
      }

      return NextResponse.json({ success: true, xpAwarded, newLevel });
    }

    if (action === 'archive_completed') {
      const nowIso = new Date().toISOString();
      const completedTasks = db.select().from(tasks).where(eq(tasks.status, 'completed')).all();

      completedTasks.forEach((task) => {
        db.update(tasks)
          .set({ status: 'archived', updated_at: nowIso })
          .where(eq(tasks.id, task.id))
          .run();
      });

      return NextResponse.json({ success: true, archivedCount: completedTasks.length });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error modifying task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
