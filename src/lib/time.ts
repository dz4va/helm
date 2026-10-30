function parseDateUTC(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

// Whole-calendar-day age of a task, 1-indexed so a task created today reads
// as "1 day old" (matching the recurring-task age badge convention).
export function daysSinceCreated(createdAt: string, asOf: string = new Date().toISOString()): number {
  const createdDateStr = createdAt.split('T')[0];
  const asOfStr = asOf.split('T')[0];
  return Math.round((parseDateUTC(asOfStr) - parseDateUTC(createdDateStr)) / 86_400_000) + 1;
}

export function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
