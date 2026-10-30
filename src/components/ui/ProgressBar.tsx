import React from 'react';
import { cn } from '@/lib/utils';

type ProgressTone = 'accent' | 'emerald' | 'amber';

const fillMap: Record<ProgressTone, string> = {
  accent: 'bg-accent-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
};

const labelMap: Record<ProgressTone, string> = {
  accent: 'text-accent-400',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
};

interface ProgressBarProps {
  value: number;
  tone?: ProgressTone;
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

export function ProgressBar({ value, tone = 'accent', size = 'md', label, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const height = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-zinc-400">{label}</span>
          <span className={cn('font-mono', labelMap[tone])}>{Math.round(clamped)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-helm-hover rounded-full overflow-hidden', height)}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', fillMap[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
