'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const MS_PER_CHAR = 28;

const DEFAULT_POSITION_CLASS = 'absolute bottom-[60px] left-1/2 -translate-x-1/2';

// Undertale-style dialogue: characters reveal one at a time, each popping in
// with its own little bounce (via the `pet-char-pop` keyframe in
// globals.css) rather than the whole string just fading in at once.
export function PetSpeechBubble({
  text,
  messageKey,
  onClick,
  positionClassName,
}: {
  text: string;
  messageKey: number;
  onClick?: () => void;
  positionClassName?: string;
}) {
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    setRevealCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setRevealCount(i);
      if (i >= text.length) clearInterval(interval);
    }, MS_PER_CHAR);
    return () => clearInterval(interval);
  }, [text, messageKey]);

  const done = revealCount >= text.length;
  const revealed = text.slice(0, revealCount);
  // Only the newest character gets its own animated inline-block - a long
  // run of adjacent inline-block spans (one per character, including
  // spaces) breaks normal text wrapping in some browsers, which is what
  // caused the bubble to balloon upward instead of wrapping. Everything
  // already "typed" is just plain text, so it wraps exactly like any
  // other paragraph.
  const settled = done ? revealed : revealed.slice(0, -1);
  const newest = done ? '' : revealed.slice(-1);

  return (
    <div
      onClick={onClick}
      className={cn(positionClassName || DEFAULT_POSITION_CLASS, 'w-[260px] z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-1 duration-150 cursor-pointer')}
    >
      <div className="relative bg-[#0b0d11] border border-helm-borderStrong rounded-lg shadow-2xl shadow-black/60 px-3 py-2 text-[11px] text-zinc-200 leading-snug whitespace-pre-wrap break-words">
        {settled}
        {newest && (
          <span key={revealCount} className="inline-block animate-pet-char-pop" style={{ whiteSpace: 'pre' }}>
            {newest}
          </span>
        )}
        {!done && <span className="inline-block w-1 h-3 bg-accent-400 ml-0.5 align-middle animate-pulse" />}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-2.5 h-2.5 bg-[#0b0d11] border-r border-b border-helm-borderStrong rotate-45 -mt-1.5" />
      </div>
    </div>
  );
}
