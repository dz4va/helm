'use client';

import React, { useEffect, useState } from 'react';
import { X, Flame, ShieldCheck, Zap, Target, TrendingUp, Award } from 'lucide-react';
import { StatTile } from '@/components/ui/StatTile';
import { computeLevelProgress } from '@/lib/xp';

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
}

const BADGE_LABELS: Record<string, string> = {
  genesis: 'Genesis',
  vanguard_rank: 'Vanguard Rank',
  streak_3: '3-Day Streak',
};

export function StatsModal({ open, onClose }: StatsModalProps) {
  const [progress, setProgress] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [totalCompleted, setTotalCompleted] = useState<number | null>(null);
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    if (!open) return;

    setAnimatedPct(0);

    Promise.all([
      fetch('/api/now').then((res) => res.json()),
      fetch('/api/performance').then((res) => res.json()),
      fetch('/api/tasks').then((res) => res.json()),
    ]).then(([now, perf, taskData]) => {
      setProgress(now.progress);
      setPerformance(perf);
      const completed = (taskData.tasks || []).filter((t: any) => t.status === 'completed').length;
      setTotalCompleted(completed);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!progress) return;
    const { xpPercentage } = computeLevelProgress(progress.total_xp || 0, progress.level || 1);
    const id = requestAnimationFrame(() => {
      setTimeout(() => setAnimatedPct(xpPercentage), 50);
    });
    return () => cancelAnimationFrame(id);
  }, [progress]);

  if (!open) return null;

  const level = progress?.level || 1;
  const totalXp = progress?.total_xp || 0;
  const streak = progress?.current_streak || 0;
  const longestStreak = progress?.longest_streak || 0;
  const badges = progress?.badges || [];
  const { requiredXP, progressXP, xpToNext } = computeLevelProgress(totalXp, level);

  const thisWeekCompleted = performance
    ? performance.dailyCompletions.slice(-7).reduce((sum: number, d: any) => sum + d.count, 0)
    : null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-black/70 backdrop-blur-xl border border-helm-borderStrong rounded-2xl w-full max-w-2xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="p-6 border-b border-helm-border flex items-start justify-between bg-accent-500/5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-accent-500/30">
              {level}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5">Your Progress</div>
              <div className="text-xl font-semibold text-white">Level {level}</div>
              <div className="text-xs text-zinc-400 mt-0.5">{totalXp.toLocaleString()} XP total</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-helm-hover transition-all duration-150 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* XP progress bar */}
          <div>
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="text-zinc-400">Progress to Level {level + 1}</span>
              <span className="font-mono text-accent-400">{progressXP.toLocaleString()} / {requiredXP.toLocaleString()} XP</span>
            </div>
            <div className="w-full bg-helm-hover h-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-500 transition-all duration-700 ease-out"
                style={{ width: `${animatedPct}%` }}
              />
            </div>
            <div className="text-[11px] text-zinc-500 mt-1.5">{xpToNext.toLocaleString()} XP to go</div>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile icon={Zap} label="Total XP" value={totalXp.toLocaleString()} />
            <StatTile icon={Flame} label="Streak" value={`${streak}d`} hint={`Longest: ${longestStreak}d`} accentClassName="text-orange-400" />
            <StatTile
              icon={Target}
              label="This Week"
              value={thisWeekCompleted ?? '—'}
              hint="Tasks completed"
              accentClassName="text-emerald-400"
            />
            <StatTile
              icon={TrendingUp}
              label="Big 3 Rate"
              value={performance ? `${performance.overallBig3Rate}%` : '—'}
              hint="All-time"
              accentClassName="text-accent-400"
            />
          </div>

          {/* Insights */}
          <div className="bg-helm-card border border-helm-border rounded-lg p-4 space-y-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-400" />
              Insights
            </div>
            <div className="text-[13px] text-zinc-300 leading-relaxed">
              {totalCompleted !== null ? (
                <>
                  You've completed <span className="text-white font-semibold">{totalCompleted}</span> tasks all-time.
                  {typeof thisWeekCompleted === 'number' && thisWeekCompleted > 0 && (
                    <> That's <span className="text-white font-semibold">{thisWeekCompleted}</span> this week alone.</>
                  )}
                  {streak >= 2 && (
                    <> You're on a <span className="text-orange-400 font-semibold">{streak}-day streak</span> — keep it going.</>
                  )}
                </>
              ) : (
                'Loading insights…'
              )}
            </div>
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-accent-400" />
                Badges
              </div>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge: string) => (
                  <span
                    key={badge}
                    className="text-xs px-3 py-1.5 rounded-full bg-accent-600/15 text-accent-300 border border-accent-500/30"
                  >
                    {BADGE_LABELS[badge] || badge}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
