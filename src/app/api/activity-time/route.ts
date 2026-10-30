import { NextResponse } from 'next/server';
import { db } from '../../../../db/client';
import { dailyActiveTime } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

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
    const days = Math.max(1, Math.min(90, Number(searchParams.get('days')) || 7));
    const window = dateRange(days);

    const rows = db.select().from(dailyActiveTime).all();
    const byDate = new Map(rows.map((r) => [r.date, r.active_seconds]));

    const data = window.map((date) => ({ date, activeSeconds: byDate.get(date) || 0 }));

    return NextResponse.json({ days, data });
  } catch (error) {
    console.error('Error fetching active time:', error);
    return NextResponse.json({ error: 'Failed to fetch active time' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { seconds } = await request.json();
    const delta = Math.max(0, Math.floor(Number(seconds) || 0));
    if (delta === 0) return NextResponse.json({ success: true });

    const todayStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    const existing = db.select().from(dailyActiveTime).where(eq(dailyActiveTime.date, todayStr)).get();
    if (existing) {
      db.update(dailyActiveTime)
        .set({ active_seconds: existing.active_seconds + delta, updated_at: nowIso })
        .where(eq(dailyActiveTime.date, todayStr))
        .run();
    } else {
      db.insert(dailyActiveTime).values({ date: todayStr, active_seconds: delta, updated_at: nowIso }).run();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording active time:', error);
    return NextResponse.json({ error: 'Failed to record active time' }, { status: 500 });
  }
}
