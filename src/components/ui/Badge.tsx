import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone =
  | 'urgent'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'neutral'
  | 'good'
  | 'warning'
  | 'info';

const toneMap: Record<BadgeTone, string> = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  medium: 'bg-accent-500/20 text-accent-400 border-accent-500/30',
  low: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30',
  neutral: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30',
  good: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  info: 'bg-accent-500/20 text-accent-400 border-accent-500/30',
};

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'text-[10px] uppercase font-bold px-2 py-0.5 rounded border whitespace-nowrap',
        toneMap[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function toneForPriority(priority: string | undefined): BadgeTone {
  switch (priority) {
    case 'urgent':
      return 'urgent';
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
      return 'low';
    default:
      return 'neutral';
  }
}
