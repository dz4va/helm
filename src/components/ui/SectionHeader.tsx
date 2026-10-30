import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  variant?: 'page' | 'section';
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  tone?: 'default' | 'warning';
  className?: string;
}

export function SectionHeader({
  variant = 'section',
  icon: Icon,
  title,
  subtitle,
  action,
  tone = 'default',
  className,
}: SectionHeaderProps) {
  const toneText = tone === 'warning' ? 'text-amber-400' : 'text-zinc-400';
  const iconTone = tone === 'warning' ? 'text-amber-400' : 'text-accent-400';

  if (variant === 'page') {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            {Icon && <Icon className={cn('w-5 h-5', iconTone)} />}
            <span>{title}</span>
          </h1>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      <h2
        className={cn(
          'text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2',
          toneText
        )}
      >
        {Icon && <Icon className={cn('w-4 h-4', iconTone)} />}
        <span>{title}</span>
      </h2>
      {action}
      {subtitle && !action && <span className="text-xs text-zinc-500">{subtitle}</span>}
    </div>
  );
}
