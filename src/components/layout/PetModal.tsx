'use client';

import React, { useEffect, useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PixelPet, PetMood, MOOD_LABEL } from './PixelPet';
import { PetMoodReasons } from './PetMoodReasons';
import { PetSpeechBubble } from './PetSpeechBubble';

const PET_NAME = 'Helmy';

const SPARKLE_POSITIONS = [
  { left: '28%', delay: '0s' },
  { left: '50%', delay: '0.45s' },
  { left: '68%', delay: '0.9s' },
];

const PET_REACTION_LINES = [
  'Hehe, that tickles.',
  "That's the spot!",
  'Aww, thanks.',
  ':) :) :)',
  "Okay, I'm blushing.",
];
const PET_REACTION_MILESTONE_LINES = ["Okay okay, I get it — you like me!", "That's a lot of petting..."];

interface PetModalProps {
  open: boolean;
  onClose: () => void;
  mood: PetMood;
  streak: number;
  lastXpAmount: number | null;
  attentionTasks: any[];
  staleRecurringTasks: any[];
  onOpenStats: () => void;
  onGoToTask: (taskId: string) => void;
}

export function PetModal({
  open,
  onClose,
  mood,
  streak,
  lastXpAmount,
  attentionTasks,
  staleRecurringTasks,
  onOpenStats,
  onGoToTask,
}: PetModalProps) {
  const [petClickCount, setPetClickCount] = useState(0);
  const [reaction, setReaction] = useState<string | null>(null);
  const [reactionKey, setReactionKey] = useState(0);
  const [hearts, setHearts] = useState<{ id: number; left: number }[]>([]);

  useEffect(() => {
    if (open) {
      setPetClickCount(0);
      setReaction(null);
      setHearts([]);
    }
  }, [open]);

  if (!open) return null;

  const handleGoToTask = (taskId: string) => {
    onGoToTask(taskId);
    onClose();
  };

  // Click-to-pet: every tap on the sprite pops a heart and a short reaction
  // line, cycling through a pool so it stays fun to mash.
  const handlePetClick = () => {
    const count = petClickCount + 1;
    setPetClickCount(count);

    const line =
      count % 5 === 0
        ? PET_REACTION_MILESTONE_LINES[Math.floor(Math.random() * PET_REACTION_MILESTONE_LINES.length)]
        : PET_REACTION_LINES[Math.floor(Math.random() * PET_REACTION_LINES.length)];
    setReaction(line);
    setReactionKey((k) => k + 1);

    const heartId = Date.now() + Math.random();
    setHearts((prev) => [...prev, { id: heartId, left: 40 + Math.random() * 20 }]);
    window.setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 1000);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-black/70 backdrop-blur-xl border border-helm-borderStrong rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        <div className="p-6 border-b border-helm-border flex items-start justify-between bg-accent-500/5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5">Your Companion</div>
            <div className="text-xl font-semibold text-white">{PET_NAME}</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-helm-hover transition-all duration-150 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="relative flex items-center justify-center h-36">
            {mood === 'excited' &&
              SPARKLE_POSITIONS.map((s, i) => (
                <span
                  key={i}
                  className="absolute text-lg animate-pet-sparkle"
                  style={{ left: s.left, animationDelay: s.delay }}
                >
                  ✨
                </span>
              ))}
            {hearts.map((h) => (
              <span key={h.id} className="absolute text-base animate-pet-heart-pop" style={{ left: `${h.left}%` }}>
                💗
              </span>
            ))}
            {reaction && (
              <PetSpeechBubble
                text={reaction}
                messageKey={reactionKey}
                onClick={() => setReaction(null)}
                positionClassName="absolute bottom-full mb-2 left-1/2 -translate-x-1/2"
              />
            )}
            <button onClick={handlePetClick} title="Pet Helmy" className="cursor-pointer active:scale-95 transition-transform duration-100">
              <PixelPet mood={mood} size={104} className={cn(mood !== 'excited' && 'animate-pet-float')} />
            </button>
          </div>

          <div className="text-center text-sm text-zinc-300">{MOOD_LABEL[mood]}</div>

          <div className="bg-helm-card border border-helm-border rounded-lg p-4">
            <PetMoodReasons
              variant="full"
              mood={mood}
              streak={streak}
              lastXpAmount={lastXpAmount}
              attentionTasks={attentionTasks}
              staleRecurringTasks={staleRecurringTasks}
              onGoToTask={handleGoToTask}
            />
          </div>

          <button
            onClick={onOpenStats}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded border border-helm-border text-xs text-zinc-400 hover:text-zinc-200 hover:border-accent-500/50 transition-colors duration-150 active:scale-95"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            View Full Stats
          </button>
        </div>
      </div>
    </div>
  );
}
