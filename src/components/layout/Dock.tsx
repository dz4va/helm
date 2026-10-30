'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, ShieldCheck } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { StatsModal } from './StatsModal';
import { XP_GAINED_EVENT, XpGainedDetail, OPEN_STATS_MODAL_EVENT } from '@/lib/xpEvents';
import { EFFORT_OPTIONS, xpForEffort } from '@/lib/xp';
import { PixelPet, PetMood, MOOD_LABEL } from './PixelPet';
import { PetMoodReasons } from './PetMoodReasons';
import { PetModal } from './PetModal';
import { PetSpeechBubble } from './PetSpeechBubble';

const dockItemClass =
  'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ease-out group-hover:scale-125 group-hover:-translate-y-1 active:scale-95';

const dockTooltipClass =
  'pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-helm-card border border-helm-borderStrong text-[11px] text-zinc-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150';

const LAST_GREETED_KEY = 'helm:pet:lastGreetedDate';
const NUDGE_THROTTLE_MS = 15 * 60 * 1000;
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const STUCK_HOURS = 3;
const IDLE_MIN_DELAY_MS = 6 * 60 * 1000;
const IDLE_MAX_EXTRA_MS = 4 * 60 * 1000;
const IDLE_REQUIRED_INACTIVITY_MS = 3 * 60 * 1000;

const PRAISE_LINES = ['Nice work!', 'You crushed that one.', "That's the spirit!", 'Boom — done.', 'Great job!'];
const IDLE_LINES = [
  'Just here if you need me.',
  'Still there? 👀',
  'Tick tock... anything on your mind?',
  'I could use a stretch. You too, maybe?',
  'All quiet on the task front.',
  "Psst — don't forget to blink once in a while.",
  "Coffee break? I won't judge.",
  "Whenever you're ready, I'm ready.",
];
// Fires at most once per page per session (see visitedPagesRef below), so
// even `/tasks` - visited constantly - only gets its line the first time
// each session, not on every navigation. `/` (the Now page) is still
// skipped since the daily greeting already covers that landing spot.
const PAGE_QUIPS: Record<string, string> = {
  '/tasks': "Let's see what's on the list.",
  '/analytics': "Numbers time — let's see how you did.",
  '/calendar': 'Big day ahead?',
  '/recurring-tasks': 'Tuning up the routines?',
  '/projects': "Bird's eye view, huh?",
  '/brain': 'Ooh, the knowledge vault.',
};

export default function Dock() {
  const pathname = usePathname();
  const router = useRouter();
  const [progress, setProgress] = useState<any>(null);
  const [attentionTasks, setAttentionTasks] = useState<any[]>([]);
  const [staleRecurringTasks, setStaleRecurringTasks] = useState<any[]>([]);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [captureText, setCaptureText] = useState('');
  const [captureEffort, setCaptureEffort] = useState<string>('medium');
  const [statsOpen, setStatsOpen] = useState(false);
  const [petModalOpen, setPetModalOpen] = useState(false);
  const [xpPop, setXpPop] = useState<number | null>(null);
  const [xpPopFading, setXpPopFading] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);
  const [petExcited, setPetExcited] = useState(false);
  const [petLevelUp, setPetLevelUp] = useState(false);
  const [lastXpAmount, setLastXpAmount] = useState<number | null>(null);
  const [petMessage, setPetMessage] = useState<string | null>(null);
  const [petMessageKey, setPetMessageKey] = useState(0);
  const petMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const petMessageActiveRef = useRef(false);
  const hasGreetedRef = useRef(false);
  const hasPolledOnceRef = useRef(false);
  const lastNudgeAtRef = useRef(0);
  const progressRef = useRef<any>(null);
  const lastInteractionRef = useRef(Date.now());
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visitedPagesRef = useRef<Set<string>>(new Set());
  const isFirstPathnameRenderRef = useRef(true);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const scheduleIdleChatter = () => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    const delay = IDLE_MIN_DELAY_MS + Math.random() * IDLE_MAX_EXTRA_MS;
    idleTimeoutRef.current = setTimeout(() => {
      const inactiveMs = Date.now() - lastInteractionRef.current;
      if (
        document.visibilityState === 'visible' &&
        !petMessageActiveRef.current &&
        inactiveMs >= IDLE_REQUIRED_INACTIVITY_MS
      ) {
        showPetMessage(IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)], 4000);
      }
      scheduleIdleChatter();
    }, delay);
  };

  const showPetMessage = (text: string, holdMs = 4000) => {
    if (petMessageTimeoutRef.current) clearTimeout(petMessageTimeoutRef.current);
    setPetMessage(text);
    setPetMessageKey((k) => k + 1);
    petMessageActiveRef.current = true;
    petMessageTimeoutRef.current = setTimeout(() => {
      setPetMessage(null);
      petMessageActiveRef.current = false;
    }, text.length * 28 + holdMs);
    // Any message (not just idle chatter) pushes back the next idle chatter,
    // so it never immediately follows something that already spoke.
    scheduleIdleChatter();
  };

  const dismissPetMessage = () => {
    if (petMessageTimeoutRef.current) clearTimeout(petMessageTimeoutRef.current);
    setPetMessage(null);
    petMessageActiveRef.current = false;
  };

  // Greets once per calendar day the first time Helm loads that day, based
  // on time of day and current streak - with a distinct late-night variant.
  const maybeGreet = (streakVal: number) => {
    if (hasGreetedRef.current) return;
    hasGreetedRef.current = true;
    const todayStr = new Date().toISOString().split('T')[0];
    if (localStorage.getItem(LAST_GREETED_KEY) === todayStr) return;
    localStorage.setItem(LAST_GREETED_KEY, todayStr);

    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      showPetMessage("It's really late — maybe wrap up soon?", 5000);
      return;
    }
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const msg =
      streakVal > 1
        ? `${timeGreeting}! ${streakVal}-day streak going — let's keep it alive.`
        : `${timeGreeting}! Let's have a great day.`;
    showPetMessage(msg, 5000);
  };

  // Decides the single most relevant proactive nudge, in priority order,
  // throttled so it can't fire more than once every 15 minutes.
  const runProactiveCheck = (data: any, attentionList: any[], staleList: any[]) => {
    const now = Date.now();
    if (now - lastNudgeAtRef.current < NUDGE_THROTTLE_MS) return;

    if (attentionList[0]) {
      lastNudgeAtRef.current = now;
      showPetMessage(`Hey — "${attentionList[0].title}" needs attention.`, 5000);
      return;
    }
    if (staleList[0]) {
      lastNudgeAtRef.current = now;
      showPetMessage(`"${staleList[0].title}" has been sitting for ${staleList[0].ageDays} days. Want to knock it out?`, 5000);
      return;
    }

    const stuckCutoff = Date.now() - STUCK_HOURS * 60 * 60 * 1000;
    const stuckTask = [...(data.big3 || []), ...(data.upNext || [])].find(
      (t: any) => t.status === 'active' && new Date(t.updated_at).getTime() < stuckCutoff
    );
    if (stuckTask) {
      lastNudgeAtRef.current = now;
      showPetMessage(`Still on "${stuckTask.title}"? Ping me if you're stuck.`, 5000);
      return;
    }

    const hour = new Date().getHours();
    const openBig3 = (data.big3 || []).filter((t: any) => t.status !== 'completed');
    if (hour >= 11 && hour < 18 && openBig3.length === 0) {
      lastNudgeAtRef.current = now;
      showPetMessage('No Big 3 set for today yet — want to pick your focus?', 5000);
    }
  };

  useEffect(() => {
    const fetchNow = () => {
      fetch('/api/now')
        .then((res) => res.json())
        .then((data) => {
          if (data.progress) setProgress(data.progress);
          const attentionList = data.attention || [];
          const staleList = (data.recurringToday || []).filter((t: any) => t.status !== 'completed' && t.ageDays >= 3);
          setAttentionTasks(attentionList);
          setStaleRecurringTasks(staleList);
          maybeGreet(data.progress?.current_streak ?? 0);
          // Skip the very first poll so a fresh page load only ever greets,
          // never immediately steps on that message with a nudge too.
          if (hasPolledOnceRef.current) {
            runProactiveCheck(data, attentionList, staleList);
          }
          hasPolledOnceRef.current = true;
        })
        .catch((e) => console.error(e));
    };
    fetchNow();
    // Periodic re-poll keeps mood/attention data fresh without a page reload,
    // which is also what lets the proactive nudges above notice changes.
    const interval = setInterval(fetchNow, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Tracks real user activity (not just page load) so idle chatter only
  // speaks up after genuine inactivity, not right after you navigate here.
  useEffect(() => {
    const markActive = () => {
      lastInteractionRef.current = Date.now();
    };
    window.addEventListener('mousemove', markActive);
    window.addEventListener('keydown', markActive);
    window.addEventListener('click', markActive);
    return () => {
      window.removeEventListener('mousemove', markActive);
      window.removeEventListener('keydown', markActive);
      window.removeEventListener('click', markActive);
    };
  }, []);

  useEffect(() => {
    scheduleIdleChatter();
    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, []);

  // First-time-this-session quip when landing on a less-visited page.
  useEffect(() => {
    if (isFirstPathnameRenderRef.current) {
      isFirstPathnameRenderRef.current = false;
      visitedPagesRef.current.add(pathname);
      return;
    }
    if (visitedPagesRef.current.has(pathname)) return;
    visitedPagesRef.current.add(pathname);
    const quip = PAGE_QUIPS[pathname];
    if (quip) showPetMessage(quip, 3500);
  }, [pathname]);

  useEffect(() => {
    const onXpGained = (e: Event) => {
      const { amount, newLevel } = (e as CustomEvent<XpGainedDetail>).detail;
      const leveledUp = typeof newLevel === 'number' && newLevel > (progressRef.current?.level ?? 1);
      if (typeof newLevel === 'number') {
        setProgress((prev: any) => (prev ? { ...prev, level: newLevel } : prev));
      }
      setXpPop(amount);
      setXpPopFading(false);
      setBadgePulse(true);
      setPetExcited(true);
      setLastXpAmount(amount);
      window.setTimeout(() => setXpPopFading(true), 650);
      window.setTimeout(() => {
        setXpPop(null);
        setXpPopFading(false);
      }, 900);
      window.setTimeout(() => setBadgePulse(false), 400);
      window.setTimeout(() => setPetExcited(false), 3000);

      if (leveledUp) {
        setPetLevelUp(true);
        window.setTimeout(() => setPetLevelUp(false), 3000);
        showPetMessage(`🎉 Level ${newLevel}! You've leveled up.`, 6000);
      } else {
        const praise = amount >= 500 ? `Whoa, big one! +${amount} XP.` : PRAISE_LINES[Math.floor(Math.random() * PRAISE_LINES.length)];
        showPetMessage(praise, 3500);
      }
    };
    window.addEventListener(XP_GAINED_EVENT, onXpGained);
    return () => window.removeEventListener(XP_GAINED_EVENT, onXpGained);
  }, []);

  const attentionCount = attentionTasks.length;
  const staleRecurringCount = staleRecurringTasks.length;
  const streak = progress?.current_streak ?? 0;

  // Mood reacts to real Helm state - a burst of "excited" on XP gain, else
  // "sad" once overdue/attention items pile up, "sleepy" with no streak
  // running, "happy" mid-streak, "idle" otherwise.
  const petMood: PetMood = petExcited
    ? 'excited'
    : attentionCount > 0 || staleRecurringCount > 0
    ? 'sad'
    : streak === 0
    ? 'sleepy'
    : streak > 0
    ? 'happy'
    : 'idle';

  const goToTask = (taskId: string) => router.push(`/tasks?focus=${encodeURIComponent(taskId)}`);

  useEffect(() => {
    const onOpenStats = () => setStatsOpen(true);
    window.addEventListener(OPEN_STATS_MODAL_EVENT, onOpenStats);
    return () => window.removeEventListener(OPEN_STATS_MODAL_EVENT, onOpenStats);
  }, []);

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureText.trim()) return;
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_task', title: captureText, priority: 'medium', effort: captureEffort }),
      });
      setCaptureText('');
      setCaptureEffort('medium');
      setQuickCaptureOpen(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const level = progress?.level || 1;

  return (
    <>
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-end gap-1 bg-black/70 backdrop-blur-xl border border-helm-borderStrong rounded-xl px-2 py-1.5 shadow-2xl shadow-black/60">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href} className="group relative flex flex-col items-center">
                <span
                  className={cn(
                    dockItemClass,
                    isActive ? 'bg-accent-500/15 text-accent-400' : 'text-zinc-400 group-hover:text-zinc-100 group-hover:bg-helm-hover'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className={cn('w-1 h-1 rounded-full mt-0.5 transition-opacity', isActive ? 'bg-accent-400 opacity-100' : 'opacity-0')} />
                <span className={dockTooltipClass}>{item.name}</span>
              </Link>
            );
          })}

          <div className="w-px h-6 bg-helm-border mx-1 self-center" />

          <div className="group relative flex flex-col items-center">
            <button onClick={() => setPetModalOpen(true)} className={cn(dockItemClass, 'hover:bg-helm-hover')}>
              <PixelPet mood={petMood} size={24} className={petMood !== 'excited' ? 'animate-pet-float-sm' : undefined} />
            </button>
            <span className="w-1 h-1 rounded-full mt-0.5 opacity-0" />

            {petLevelUp && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {['🎉', '✨', '🎊'].map((emoji, i) => (
                  <span
                    key={i}
                    className="absolute text-sm animate-pet-sparkle"
                    style={{ left: `${20 + i * 25}%`, animationDelay: `${i * 0.2}s` }}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
            )}

            {petMessage && (
              <PetSpeechBubble text={petMessage} messageKey={petMessageKey} onClick={dismissPetMessage} />
            )}

            <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-60 opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 z-50">
              <div className="bg-[#0b0d11] border border-helm-borderStrong rounded-lg shadow-2xl shadow-black/60 p-2.5 text-left space-y-2">
                <div className="text-[11px] font-semibold text-zinc-200">{MOOD_LABEL[petMood]}</div>
                <PetMoodReasons
                  variant="compact"
                  mood={petMood}
                  streak={streak}
                  lastXpAmount={lastXpAmount}
                  attentionTasks={attentionTasks}
                  staleRecurringTasks={staleRecurringTasks}
                  onGoToTask={goToTask}
                />
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-helm-border mx-1 self-center" />

          <button onClick={() => setQuickCaptureOpen(true)} className="group relative flex flex-col items-center">
            <span className={cn(dockItemClass, 'text-accent-400 hover:bg-helm-hover')}>
              <Plus className="w-4 h-4" />
            </span>
            <span className="w-1 h-1 rounded-full mt-0.5 opacity-0" />
            <span className={dockTooltipClass}>Quick Capture</span>
          </button>

          <button onClick={() => setStatsOpen(true)} className="group relative flex flex-col items-center">
            {xpPop !== null && (
              <span
                className={cn(
                  'pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-bold text-emerald-400 transition-opacity duration-200',
                  xpPopFading
                    ? 'opacity-0 -translate-y-2'
                    : 'opacity-100 animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-200'
                )}
              >
                +{xpPop} XP
              </span>
            )}
            <span
              className={cn(
                dockItemClass,
                'relative text-zinc-400 hover:text-zinc-100 hover:bg-helm-hover',
                badgePulse && 'scale-125 -translate-y-1'
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              <span
                className={cn(
                  'absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent-500 text-white text-[8px] font-bold flex items-center justify-center transition-transform duration-200',
                  badgePulse && 'scale-125 ring-2 ring-emerald-400/70'
                )}
              >
                {level}
              </span>
            </span>
            <span className="w-1 h-1 rounded-full mt-0.5 opacity-0" />
            <span className={dockTooltipClass}>Level {level} — Your Stats</span>
          </button>
        </div>
      </nav>

      <StatsModal open={statsOpen} onClose={() => setStatsOpen(false)} />

      <PetModal
        open={petModalOpen}
        onClose={() => setPetModalOpen(false)}
        mood={petMood}
        streak={streak}
        lastXpAmount={lastXpAmount}
        attentionTasks={attentionTasks}
        staleRecurringTasks={staleRecurringTasks}
        onOpenStats={() => {
          setPetModalOpen(false);
          setStatsOpen(true);
        }}
        onGoToTask={goToTask}
      />

      {quickCaptureOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-black/70 backdrop-blur-xl border border-helm-borderStrong rounded-lg w-full max-w-lg p-4 shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-accent-400" /> Quick Capture Task
              </h3>
              <button onClick={() => setQuickCaptureOpen(false)} className="text-zinc-400 hover:text-zinc-200 text-xs">
                ✕
              </button>
            </div>
            <form onSubmit={handleCapture}>
              <input
                type="text"
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                placeholder="What's on your mind? (e.g. Fix the login bug)"
                autoFocus
                className="w-full bg-helm-bg border border-helm-borderStrong rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 mb-3"
              />
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] text-zinc-500">Effort (how much work this actually takes)</label>
                <select
                  value={captureEffort}
                  onChange={(e) => setCaptureEffort(e.target.value)}
                  className="bg-helm-bg border border-helm-border rounded px-2 py-1 text-xs text-zinc-200 capitalize focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30"
                >
                  {EFFORT_OPTIONS.map((eff) => (
                    <option key={eff} value={eff} className="capitalize">{eff} — {xpForEffort(eff)} XP</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickCaptureOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-accent-600 hover:bg-accent-500 text-white text-xs font-medium rounded transition-all duration-150 active:scale-95"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
