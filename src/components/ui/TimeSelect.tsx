'use client';

import React from 'react';
import { Clock, X } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const selectClass =
  'bg-helm-bg border border-helm-border rounded px-1.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30';

// Dropdown-based 24h time picker (HH:MM). Native <input type="time"> renders
// inconsistently across browsers/OS locales (e.g. an unfillable seconds or
// AM/PM segment stuck on "--"), so this uses two plain <select>s instead.
export function TimeSelect({
  value,
  onChange,
}: {
  value: string; // 'HH:MM' or ''
  onChange: (value: string) => void;
}) {
  const [h, m] = value ? value.split(':') : ['', ''];

  const setPart = (hh: string, mm: string) => {
    if (!hh || !mm) {
      onChange('');
      return;
    }
    onChange(`${hh}:${mm}`);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Clock className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
      <select value={h} onChange={(e) => setPart(e.target.value, m || '00')} className={selectClass}>
        <option value="">--</option>
        {HOURS.map((hh) => (
          <option key={hh} value={hh}>{hh}</option>
        ))}
      </select>
      <span className="text-zinc-500 text-xs">:</span>
      <select value={m} onChange={(e) => setPart(h || '00', e.target.value)} className={selectClass}>
        <option value="">--</option>
        {MINUTES.map((mm) => (
          <option key={mm} value={mm}>{mm}</option>
        ))}
      </select>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          title="Clear time"
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-helm-hover transition-colors duration-150"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
