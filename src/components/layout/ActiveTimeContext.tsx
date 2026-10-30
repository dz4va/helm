'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const FLUSH_INTERVAL_MS = 30000;

interface ActiveTimeContextValue {
  activeSeconds: number;
}

const ActiveTimeContext = createContext<ActiveTimeContextValue | null>(null);

export function ActiveTimeProvider({ children }: { children: React.ReactNode }) {
  const [activeSeconds, setActiveSeconds] = useState(0);

  // Lives at the layout level (not inside a page component) specifically so
  // it survives client-side navigation between pages - Next.js unmounts the
  // page segment on every route change but keeps the layout mounted, so
  // tracking here (instead of in page.tsx) is what stops the timer from
  // resetting to 0 every time you visit another page.
  useEffect(() => {
    let pending = 0;

    // Counts every second the tab is open, regardless of visibility/focus -
    // switching to another Space/screen (or another app) still counts as
    // active work time. Only a closed tab stops the clock.
    const tick = setInterval(() => {
      setActiveSeconds((s) => s + 1);
      pending += 1;
    }, 1000);

    const flush = () => {
      if (pending === 0) return;
      const body = JSON.stringify({ seconds: pending });
      pending = 0;
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/activity-time', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('/api/activity-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    };

    const flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
    window.addEventListener('beforeunload', flush);

    return () => {
      clearInterval(tick);
      clearInterval(flushTimer);
      flush();
      window.removeEventListener('beforeunload', flush);
    };
  }, []);

  return <ActiveTimeContext.Provider value={{ activeSeconds }}>{children}</ActiveTimeContext.Provider>;
}

export function useActiveTime() {
  const ctx = useContext(ActiveTimeContext);
  if (!ctx) throw new Error('useActiveTime must be used within an ActiveTimeProvider');
  return ctx;
}
