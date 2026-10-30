import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  label: string;
  className?: string;
}

export function EmptyState({ label, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'text-xs text-zinc-500 py-3 text-center border border-dashed border-helm-border rounded',
        className
      )}
    >
      {label}
    </div>
  );
}
