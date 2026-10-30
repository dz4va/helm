export const XP_GAINED_EVENT = 'helm:xp-gained';

export type XpGainedDetail = { amount: number; newLevel?: number };

export function dispatchXpGained(detail: XpGainedDetail) {
  window.dispatchEvent(new CustomEvent<XpGainedDetail>(XP_GAINED_EVENT, { detail }));
}

// Lets any component (e.g. NotificationCenter, mounted outside Dock in the
// root layout header) ask Dock to open the Level/Stats modal without lifting
// that modal's state out of Dock.
export const OPEN_STATS_MODAL_EVENT = 'helm:open-stats-modal';

export function dispatchOpenStatsModal() {
  window.dispatchEvent(new Event(OPEN_STATS_MODAL_EVENT));
}
