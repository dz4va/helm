'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toISODate(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

// Popover calendar for picking a 'YYYY-MM-DD' date, styled to match the rest
// of the dark command-center UI instead of relying on the native browser
// date picker widget.
export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
}: {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => (value ? Number(value.split('-')[0]) : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (value ? Number(value.split('-')[1]) - 1 : new Date().getMonth()));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) return;
    const [y, m] = value.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const goToMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDayOfWeek }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-1.5 bg-helm-bg border border-helm-border rounded px-3 py-1.5 text-xs text-left transition-colors duration-150',
          disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-accent-500/50',
          value ? 'text-zinc-200' : 'text-zinc-500'
        )}
      >
        <CalendarIcon className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        {value || placeholder}
      </button>

      {open && !disabled && (
        <div className="absolute left-0 top-9 z-50 w-64 bg-black/90 backdrop-blur-xl border border-helm-borderStrong rounded-lg shadow-2xl shadow-black/60 p-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-helm-hover transition-colors duration-150"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-medium text-zinc-200">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-helm-hover transition-colors duration-150"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-zinc-500 mb-1">
            {WEEKDAY_LABELS.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const iso = toISODate(viewYear, viewMonth, day);
              const isSelected = iso === value;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={cn(
                    'text-[11px] py-1 rounded transition-colors duration-150',
                    isSelected ? 'bg-accent-600 text-white' : 'text-zinc-300 hover:bg-helm-hover'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="mt-2 flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors duration-150"
            >
              <X className="w-3 h-3" /> Clear date
            </button>
          )}
        </div>
      )}
    </div>
  );
}
