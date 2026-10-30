import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  accentClassName?: string;
  className?: string;
}

export function StatTile({ label, value, hint, icon: Icon, accentClassName, className }: StatTileProps) {
  return (
    <div className={cn('bg-helm-card border border-helm-border rounded-lg p-4 space-y-1', className)}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-helm-muted flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span>{label}</span>
      </div>
      <div className={cn('text-xl font-bold text-accent-400', accentClassName)}>{value}</div>
      {hint && <div className="text-[10px] text-zinc-500">{hint}</div>}
    </div>
  );
}
