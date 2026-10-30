import { NextResponse } from 'next/server';
import { db } from '../../../../db/client';
import { tasks, xpTransactions, dailyFocus } from '../../../../db/schema';
import { isNotNull, gte } from 'drizzle-orm';

function toDayStr(iso: string) {
  return iso.slice(0, 10);
}

function dateRange(days: number) {
  const out: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.max(1, Math.min(365, Number(searchParams.get('days')) || 120));

    const window = dateRange(days);
    const sinceIso = `${window[0]}T00:00:00.000Z`;

    // 1. Daily task completions, zero-filled across the full window.
    const completedTasks = db
      .select()
      .from(tasks)
      .where(isNotNull(tasks.completed_at))
      .all();

    const completionsByDay = new Map<string, number>();
    for (const t of completedTasks) {
      if (!t.completed_at) continue;
      const day = toDayStr(t.completed_at);
      if (!window.includes(day)) continue;
      completionsByDay.set(day, (completionsByDay.get(day) || 0) + 1);
    }

    // XP earned per day across the full window, used to enrich both the
    // streak heatmap tooltip (count + xp per day) and the XP-per-day chart.
    const xpRows = db
      .select()
      .from(xpTransactions)
      .where(gte(xpTransactions.created_at, sinceIso))
      .all();

    const xpByDayMap = new Map<string, number>();
    for (const row of xpRows) {
      const day = toDayStr(row.created_at);
      if (!window.includes(day)) continue;
      xpByDayMap.set(day, (xpByDayMap.get(day) || 0) + row.amount);
    }

    const dailyCompletions = window.map((date) => ({
      date,
      count: completionsByDay.get(date) || 0,
      xp: xpByDayMap.get(date) || 0,
    }));
    const xpByDay = window.slice(-14).map((date) => ({
      date,
      amount: xpByDayMap.get(date) || 0,
    }));

    // 2. Streak derived fresh from dailyCompletions (user_progress columns are stale).
    let currentStreak = 0;
    for (let i = dailyCompletions.length - 1; i >= 0; i--) {
      if (dailyCompletions[i].count > 0) {
        currentStreak++;
      } else {
        break;
      }
    }
    let longestStreakInRange = 0;
    let running = 0;
    for (const day of dailyCompletions) {
      running = day.count > 0 ? running + 1 : 0;
      longestStreakInRange = Math.max(longestStreakInRange, running);
    }

    // 4. Big 3 completion rate, joined against tasks, sparse (no zero-fill).
    const focusRows = db
      .select()
      .from(dailyFocus)
      .where(gte(dailyFocus.date, window[0]))
      .all();

    const taskIds = Array.from(new Set(focusRows.map((f) => f.task_id)));
    const focusTasks =
      taskIds.length > 0
        ? db.select().from(tasks).all().filter((t) => taskIds.includes(t.id))
        : [];
    const taskCompletedMap = new Map(focusTasks.map((t) => [t.id, !!t.completed_at]));

    const big3ByDate = new Map<string, { total: number; completed: number }>();
    for (const f of focusRows) {
      const entry = big3ByDate.get(f.date) || { total: 0, completed: 0 };
      entry.total += 1;
      if (taskCompletedMap.get(f.task_id)) entry.completed += 1;
      big3ByDate.set(f.date, entry);
    }
    const big3Rate = Array.from(big3ByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { total, completed }]) => ({
        date,
        total,
        completed,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      }));

    const totalFocusAll = big3Rate.reduce((sum, d) => sum + d.total, 0);
    const totalCompletedAll = big3Rate.reduce((sum, d) => sum + d.completed, 0);
    const overallBig3Rate = totalFocusAll > 0 ? Math.round((totalCompletedAll / totalFocusAll) * 100) : 0;

    return NextResponse.json({
      days,
      dailyCompletions,
      streak: { currentStreak, longestStreakInRange },
      xpByDay,
      big3Rate,
      overallBig3Rate,
    });
  } catch (error) {
    console.error('Error fetching Helm performance data:', error);
    return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
  }
}
