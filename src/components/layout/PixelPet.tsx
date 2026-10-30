'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

export type PetMood = 'idle' | 'happy' | 'excited' | 'sleepy' | 'sad';

// 10x10 pixel-art blob body, shared across all moods - only the face (eyes +
// mouth, layered on top per mood below) and body tint change.
const BODY_MASK = [
  '...OOOO...',
  '..OBBBBO..',
  '.OBBBBBBO.',
  'OBBBBBBBBO',
  'OBBBBBBBBO',
  'OBBBBBBBBO',
  'OBBBBBBBBO',
  '.OBBBBBBO.',
  '..OBBBBO..',
  '...OOOO...',
];

type FacePixel = [x: number, y: number, char: 'E' | 'M'];

const EYES: FacePixel[] = [[3, 4, 'E'], [6, 4, 'E']];

const FACE_OVERLAYS: Record<PetMood, FacePixel[]> = {
  idle: [...EYES, [4, 6, 'M'], [5, 6, 'M']],
  happy: [...EYES, [3, 6, 'M'], [4, 7, 'M'], [5, 7, 'M'], [6, 6, 'M']],
  excited: [...EYES, [4, 6, 'M'], [5, 6, 'M'], [4, 7, 'M'], [5, 7, 'M']],
  sleepy: [...EYES, [4, 6, 'M'], [5, 6, 'M']],
  sad: [...EYES, [3, 5, 'M'], [6, 5, 'M'], [4, 6, 'M'], [5, 6, 'M']],
};

const OUTLINE_COLOR = '#0b0d11';
const FACE_COLOR = '#0b0d11';

const BODY_COLOR: Record<PetMood, string> = {
  idle: '#c17f59', // accent terracotta - neutral default
  happy: '#34d399', // emerald - things are going well
  excited: '#fbbf24', // amber - just earned XP
  sleepy: '#94a3b8', // slate - no streak / low activity
  sad: '#6b8cae', // muted blue - overdue/attention items piling up
};

const MOOD_BADGE: Partial<Record<PetMood, string>> = {
  excited: '✨',
  sleepy: '💤',
};

export const MOOD_LABEL: Record<PetMood, string> = {
  idle: "All quiet — I'm here whenever you're ready.",
  happy: 'Nice streak! Keep it going.',
  excited: 'XP gained! Great work.',
  sleepy: "No streak going yet today — let's start one.",
  sad: 'A few things are piling up — could use your attention.',
};

export function PixelPet({ mood, size = 32, className }: { mood: PetMood; size?: number; className?: string }) {
  const cells = useMemo(() => {
    const grid = BODY_MASK.map((row) => row.split(''));
    for (const [x, y, char] of FACE_OVERLAYS[mood]) {
      grid[y][x] = char;
    }
    return grid.flat();
  }, [mood]);

  const cellSize = size / 10;
  const badge = MOOD_BADGE[mood];

  return (
    <div
      className={cn('relative inline-block', mood === 'excited' && 'animate-bounce', mood === 'sad' && 'opacity-80', className)}
      style={{ width: size, height: size }}
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(10, ${cellSize}px)`, gridTemplateRows: `repeat(10, ${cellSize}px)` }}
      >
        {cells.map((char, i) => {
          const color = char === 'O' ? OUTLINE_COLOR : char === 'B' ? BODY_COLOR[mood] : char === 'E' || char === 'M' ? FACE_COLOR : 'transparent';
          return <div key={i} style={{ width: cellSize, height: cellSize, background: color }} />;
        })}
      </div>
      {badge && (
        <span className="absolute -top-1 -right-1 text-[10px] leading-none select-none">{badge}</span>
      )}
    </div>
  );
}
