import React from 'react';
import { cn } from '@/lib/utils';

// Small "days old" indicator, tiered green (fresh) -> amber -> red (stale).
// Shared by the Recurring/Big 3/Needs Attention cards on the Now page and
// the Tasks table so the freshness convention reads the same everywhere.
export function AgeBadge({ days, className }: { days: number; className?: string }) {
  return (
    <span
      title={days >= 3 ? `${days} days old — needs attention` : `${days} day${days > 1 ? 's' : ''} old`}
      className={cn(
        'text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border flex-shrink-0',
        days <= 1
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
          : days === 2
          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          : 'bg-red-500/15 text-red-400 border-red-500/30',
        className
      )}
    >
      {days}d
    </span>
  );
}
