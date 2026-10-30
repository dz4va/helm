import React, { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

interface StreakHeatmapProps {
  data: { date: string; count: number; xp?: number }[];
  currentStreak: number;
  longestStreakInRange: number;
}

// Sequential terracotta ramp, darkest/most-saturated = highest activity.
const RAMP = ['#e0b49b', '#d29876', '#c17f59', '#a8674a', '#8a4a2f'];

function colorForCount(count: number, maxCount: number) {
  if (count === 0) return null;
  if (maxCount <= 1) return RAMP[4];
  const ratio = count / maxCount;
  if (ratio >= 0.8) return RAMP[4];
  if (ratio >= 0.6) return RAMP[3];
  if (ratio >= 0.4) return RAMP[2];
  if (ratio >= 0.2) return RAMP[1];
  return RAMP[0];
}

function formatDateLabel(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

type Cell = { date: string; count: number; xp?: number } | null;

const GAP_PX = 3;
const MIN_CELL_PX = 9;
const MAX_CELL_PX = 16;

export function StreakHeatmap({ data, currentStreak, longestStreakInRange }: StreakHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<{ cell: NonNullable<Cell>; x: number; y: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const hasData = data.some((d) => d.count > 0);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!hasData) {
    return <EmptyState label="No task completions in this window yet." />;
  }

  const maxCount = Math.max(...data.map((d) => d.count));

  // Build columns of up to 7 rows (Sun..Sat), starting a new column both on
  // a plain week wrap AND whenever a new month begins - so the column
  // holding the 1st never carries the previous month's trailing days above
  // it, and the column holding the 30th/31st never carries the next
  // month's leading days below it.
  const columns: Cell[][] = [];
  let currentColumn: Cell[] = new Array(7).fill(null);
  let columnHasData = false;

  for (const day of data) {
    const dateObj = new Date(`${day.date}T00:00:00`);
    const dow = dateObj.getDay();
    const isMonthStart = dateObj.getDate() === 1;

    if (columnHasData && (dow === 0 || isMonthStart)) {
      columns.push(currentColumn);
      currentColumn = new Array(7).fill(null);
      columnHasData = false;
    }

    currentColumn[dow] = day;
    columnHasData = true;
  }
  if (columnHasData) columns.push(currentColumn);

  const monthLabels = columns.map((col, idx) => {
    const first = col.find((c): c is NonNullable<Cell> => c !== null);
    if (!first) return null;
    const isMonthStartColumn = Number(first.date.slice(8, 10)) === 1;
    if (!isMonthStartColumn && idx !== 0) return null;
    return new Date(`${first.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short' });
  });

  // Square size is derived from the measured container width so the grid
  // always packs the columns tightly edge-to-edge across the full width,
  // clamped so squares stay legible without ballooning on wide screens.
  const rawCellPx = columns.length > 0 ? (containerWidth - (columns.length - 1) * GAP_PX) / columns.length : MIN_CELL_PX;
  const cellPx = Math.min(MAX_CELL_PX, Math.max(MIN_CELL_PX, Math.floor(rawCellPx)));

  const showPopover = (cell: NonNullable<Cell>, e: React.MouseEvent) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    const cellRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!containerRect) return;
    setPopover({
      cell,
      x: cellRect.left - containerRect.left + cellRect.width / 2,
      y: cellRect.top - containerRect.top,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-orange-400 font-semibold">
          <Flame className="w-3.5 h-3.5" />
          <span>{currentStreak} day{currentStreak === 1 ? '' : 's'} current streak</span>
        </div>
        <div className="text-zinc-500">Longest: {longestStreakInRange}d</div>
        <div className="flex items-center gap-1 text-zinc-500 ml-auto">
          Less
          {[null, ...RAMP].map((c, i) => (
            <span
              key={i}
              className="w-[8px] h-[8px] rounded-sm inline-block bg-helm-hover border border-helm-border"
              style={c ? { backgroundColor: c, borderColor: c } : undefined}
            />
          ))}
          More
        </div>
      </div>

      <div ref={containerRef} className="relative">
        {popover && (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-full -mt-1.5 px-2 py-1.5 rounded bg-helm-bg border border-helm-borderStrong shadow-lg text-[11px] whitespace-nowrap pointer-events-none"
            style={{ left: popover.x, top: popover.y }}
          >
            <div className="font-semibold text-zinc-100">{formatDateLabel(popover.cell.date)}</div>
            <div className="text-zinc-400">
              {popover.cell.count} task{popover.cell.count === 1 ? '' : 's'} completed
              {typeof popover.cell.xp === 'number' ? ` · ${popover.cell.xp} XP` : ''}
            </div>
          </div>
        )}

        <div className="flex mb-1" style={{ gap: GAP_PX }}>
          {monthLabels.map((label, idx) => (
            <div key={idx} className="text-[10px] text-zinc-500 overflow-visible" style={{ width: cellPx }}>
              {label ?? ''}
            </div>
          ))}
        </div>

        <div className="flex" style={{ gap: GAP_PX }} onMouseLeave={() => setPopover(null)}>
          {columns.map((column, wIdx) => (
            <div key={wIdx} className="flex flex-col" style={{ gap: GAP_PX }}>
              {column.map((cell, cIdx) => {
                if (!cell) {
                  return <div key={cIdx} className="rounded-[2px]" style={{ width: cellPx, height: cellPx }} />;
                }
                const color = colorForCount(cell.count, maxCount);
                return (
                  <div
                    key={cIdx}
                    onMouseEnter={(e) => showPopover(cell, e)}
                    className="rounded-[2px] bg-helm-hover border border-helm-border cursor-default hover:scale-125 transition-transform duration-100"
                    style={{ width: cellPx, height: cellPx, ...(color ? { backgroundColor: color, borderColor: color } : {}) }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
