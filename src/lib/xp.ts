import { daysSinceCreated } from './time';

// XP is driven by effort (how much work a task actually takes), not priority
// (which is about urgency/importance) - a high-priority "say good morning in
// standup" task and a high-priority multi-day migration shouldn't earn the
// same reward just because both are tagged "high".
export const EFFORT_OPTIONS = ['trivial', 'small', 'medium', 'large'] as const;

export const EFFORT_XP: Record<string, number> = { trivial: 50, small: 150, medium: 350, large: 750 };

export function xpForEffort(effort: string): number {
  return EFFORT_XP[effort] ?? EFFORT_XP.medium;
}

// XP decays the longer a task sits before being completed, so stale backlog
// items are worth progressively less than fresh work - a 2-day grace period
// gives full credit, then a linear taper down to a floor (never zero, so
// finishing something ancient still beats leaving it to rot). `ageDays` uses
// the same 1-indexed calendar-day convention as daysSinceCreated/AgeBadge
// (created today = 1) so the on-card XP preview always matches the payout.
const AGE_GRACE_DAYS = 2;
const AGE_DECAY_WINDOW_DAYS = 28;
const AGE_XP_FLOOR = 0.15;

export function ageXpMultiplier(ageDays: number): number {
  if (ageDays <= AGE_GRACE_DAYS) return 1;
  const decayed = 1 - ((ageDays - AGE_GRACE_DAYS) / AGE_DECAY_WINDOW_DAYS) * (1 - AGE_XP_FLOOR);
  return Math.max(AGE_XP_FLOOR, decayed);
}

export function xpForTask(effort: string, createdAt: string, completedAt: string): number {
  return Math.round(xpForEffort(effort) * ageXpMultiplier(daysSinceCreated(createdAt, completedAt)));
}

export function computeLevelProgress(totalXp: number, level: number) {
  const currentLevelXP = Math.floor(100 * Math.pow(Math.max(0, level - 1), 2.2));
  const nextLevelXP = Math.floor(100 * Math.pow(level, 2.2));
  const progressXP = Math.max(0, totalXp - currentLevelXP);
  const requiredXP = Math.max(1, nextLevelXP - currentLevelXP);
  const xpPercentage = Math.min(100, Math.floor((progressXP / requiredXP) * 100));
  const xpToNext = Math.max(0, nextLevelXP - totalXp);

  return { currentLevelXP, nextLevelXP, progressXP, requiredXP, xpPercentage, xpToNext };
}
