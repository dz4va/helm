export interface ProjectStats {
  project: any;
  totalCount: number;
  completedCount: number;
  activeCount: number;
  completedThisWeek: number;
  // Completions per day, oldest -> newest, for the last ACTIVITY_WINDOW_DAYS.
  activitySeries: number[];
}

// 'archived' means "completed, then cleaned up" (see archive_completed in
// api/tasks/route.ts) - it's a done state, not an open one. 'cancelled' is
// also not open, but isn't "done" either, so it counts toward neither active
// nor completed.
export const DONE_STATUSES = new Set(['completed', 'archived']);
export const NOT_ACTIVE_STATUSES = new Set(['completed', 'archived', 'cancelled']);
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const ACTIVITY_WINDOW_DAYS = 14;

function dayKey(iso: string) {
  return iso.split('T')[0];
}

// These are ongoing work streams with no fixed scope - tasks keep getting
// added indefinitely, so an all-time "% complete" just drifts based on how
// much backlog has piled up rather than reflecting real progress. A rolling
// "completed this week" count (and the daily activitySeries sparkline) are a
// much better read on recent momentum.
export function computeProjectStats(projects: any[], tasks: any[]): ProjectStats[] {
  const weekAgo = Date.now() - ONE_WEEK_MS;

  const todayUTC = new Date();
  const dayKeys: string[] = [];
  for (let i = ACTIVITY_WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), todayUTC.getUTCDate() - i));
    dayKeys.push(d.toISOString().split('T')[0]);
  }

  return projects.map((project) => {
    const projTasks = tasks.filter((t) => t.project_id === project.id);
    const completedCount = projTasks.filter((t) => DONE_STATUSES.has(t.status)).length;
    const activeCount = projTasks.filter((t) => !NOT_ACTIVE_STATUSES.has(t.status)).length;
    const totalCount = projTasks.length;
    const completedThisWeek = projTasks.filter(
      (t) => DONE_STATUSES.has(t.status) && t.completed_at && new Date(t.completed_at).getTime() >= weekAgo
    ).length;

    const countsByDay = new Map<string, number>();
    for (const t of projTasks) {
      if (!DONE_STATUSES.has(t.status) || !t.completed_at) continue;
      const key = dayKey(t.completed_at);
      countsByDay.set(key, (countsByDay.get(key) || 0) + 1);
    }
    const activitySeries = dayKeys.map((key) => countsByDay.get(key) || 0);

    return { project, totalCount, completedCount, activeCount, completedThisWeek, activitySeries };
  });
}

export function computeAllocation(stats: ProjectStats[]) {
  const totalTasks = stats.reduce((sum, s) => sum + s.totalCount, 0);
  return stats
    .filter((s) => s.totalCount > 0)
    .map((s) => ({
      project: s.project,
      percent: totalTasks > 0 ? Math.round((s.totalCount / totalTasks) * 100) : 0,
    }))
    .sort((a, b) => b.percent - a.percent);
}
