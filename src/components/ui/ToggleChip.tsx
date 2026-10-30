import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToggleChipProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: LucideIcon;
}

export function ToggleChip({ active, onClick, label, icon: Icon }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-[11px] font-medium px-2.5 py-1 rounded border flex items-center gap-1.5 transition-all duration-150 active:scale-95',
        active
          ? 'bg-accent-600/15 text-accent-400 border-accent-500/30'
          : 'text-zinc-500 border-helm-border hover:text-zinc-300 hover:border-helm-borderStrong'
      )}
    >
      {Icon && <Icon className="w-3 h-3" />}
      <span>{label}</span>
    </button>
  );
}
