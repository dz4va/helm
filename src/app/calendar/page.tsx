'use client';

import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';

const SLOT_TONE: Record<string, BadgeTone> = {
  meeting: 'warning',
  focus: 'info',
  open: 'good',
};

export default function CalendarPage() {
  const scheduleSlots = [
    { time: '09:00', title: 'Open Capacity', type: 'open', duration: '1h 30m' },
    { time: '10:30', title: 'Team Daily Standup (DSU)', type: 'meeting', duration: '30m' },
    { time: '11:00', title: 'Deep Work Focus Window', type: 'focus', duration: '2h 30m' },
    { time: '13:30', title: 'Client Sync / Call', type: 'meeting', duration: '1h 00m' },
    { time: '14:30', title: 'Open Capacity', type: 'open', duration: '2h 30m' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionHeader
        variant="page"
        icon={CalendarIcon}
        title="Work Capacity Calendar"
        subtitle="Google Calendar Integration • Work capacity and focus window optimization"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Timeline View */}
        <Card padding="lg" className="md:col-span-2 space-y-4">
          <SectionHeader title="Today Timeline Schedule" />
          <div className="space-y-3">
            {scheduleSlots.map((slot, idx) => (
              <div
                key={idx}
                className="p-3 bg-helm-hover border border-helm-borderStrong rounded flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-accent-400">{slot.time}</span>
                  <div>
                    <div className="text-[13px] font-semibold text-zinc-200">{slot.title}</div>
                    <div className="text-[10px] text-zinc-400">{slot.duration}</div>
                  </div>
                </div>
                <Badge tone={SLOT_TONE[slot.type]}>{slot.type}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Capacity Summary Side Panel */}
        <Card padding="lg" className="space-y-4">
          <SectionHeader title="Capacity Summary" />
          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-2.5 bg-helm-hover rounded border border-helm-borderStrong">
              <span className="text-zinc-400">Meetings Scheduled</span>
              <span className="font-mono text-amber-400">1h 30m</span>
            </div>
            <div className="flex justify-between p-2.5 bg-helm-hover rounded border border-helm-borderStrong">
              <span className="text-zinc-400">Open Work Time</span>
              <span className="font-mono text-emerald-400">5h 20m</span>
            </div>
            <div className="flex justify-between p-2.5 bg-helm-hover rounded border border-helm-borderStrong">
              <span className="text-zinc-400">Longest Focus Block</span>
              <span className="font-mono text-accent-400">2h 30m</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
