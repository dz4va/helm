'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { PetMood } from './PixelPet';

// Shared "why does the pet feel this way" breakdown, rendered both in the
// Dock hover popover (compact) and the full PetModal (roomier, more items).
export function PetMoodReasons({
  mood,
  streak,
  lastXpAmount,
  attentionTasks,
  staleRecurringTasks,
  onGoToTask,
  variant = 'compact',
}: {
  mood: PetMood;
  streak: number;
  lastXpAmount: number | null;
  attentionTasks: any[];
  staleRecurringTasks: any[];
  onGoToTask: (taskId: string) => void;
  variant?: 'compact' | 'full';
}) {
  const isFull = variant === 'full';
  const itemLimit = isFull ? 4 : 3;
  const textSize = isFull ? 'text-[13px]' : 'text-[11px]';

  if (mood === 'excited') {
    return lastXpAmount !== null ? (
      <div className={cn(textSize, 'text-emerald-400 font-medium', isFull && 'text-center')}>+{lastXpAmount} XP just now</div>
    ) : null;
  }

  if (mood === 'happy') {
    return (
      <div className={cn(textSize, 'text-zinc-400', isFull && 'text-center text-zinc-300')}>
        Current streak: <span className="text-emerald-400 font-semibold">{streak} day{streak === 1 ? '' : 's'}</span>
      </div>
    );
  }

  if (mood === 'sleepy') {
    return (
      <div className={cn(textSize, 'text-zinc-400', isFull && 'text-center')}>
        No streak running yet — complete something today to start one.
      </div>
    );
  }

  if (mood === 'idle') {
    return (
      <div className={cn(textSize, 'text-zinc-400', isFull && 'text-center')}>
        Nothing urgent right now — steady as she goes.
      </div>
    );
  }

  // sad
  return (
    <div className="space-y-2">
      {attentionTasks.length > 0 && (
        <div>
          <div className={cn(textSize, 'text-red-400 font-medium mb-1')}>{attentionTasks.length} urgent / blocked</div>
          <div className="space-y-0.5">
            {attentionTasks.slice(0, itemLimit).map((t: any) => (
              <button
                key={t.id}
                onClick={() => onGoToTask(t.id)}
                className={cn(textSize, 'block w-full text-left truncate text-zinc-400 hover:text-accent-400 transition-colors duration-150')}
              >
                · {t.title}
              </button>
            ))}
            {attentionTasks.length > itemLimit && (
              <div className={cn(textSize, 'text-zinc-600')}>+{attentionTasks.length - itemLimit} more</div>
            )}
          </div>
        </div>
      )}
      {staleRecurringTasks.length > 0 && (
        <div>
          <div className={cn(textSize, 'text-amber-400 font-medium mb-1')}>
            {staleRecurringTasks.length} recurring task{staleRecurringTasks.length === 1 ? '' : 's'} overdue
          </div>
          <div className="space-y-0.5">
            {staleRecurringTasks.slice(0, itemLimit).map((t: any) => (
              <button
                key={t.id}
                onClick={() => onGoToTask(t.id)}
                className={cn(textSize, 'block w-full text-left truncate text-zinc-400 hover:text-accent-400 transition-colors duration-150')}
              >
                · {t.title} <span className="text-zinc-600">({t.ageDays}d)</span>
              </button>
            ))}
            {staleRecurringTasks.length > itemLimit && (
              <div className={cn(textSize, 'text-zinc-600')}>+{staleRecurringTasks.length - itemLimit} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
