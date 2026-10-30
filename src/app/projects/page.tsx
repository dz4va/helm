'use client';

import React, { useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { Sparkline } from '@/components/ui/Sparkline';
import { computeProjectStats, ACTIVITY_WINDOW_DAYS } from '@/lib/projectStats';

// Matches the day ordering computeProjectStats builds activitySeries against
// (oldest -> newest, ending today), so each bar's <title> stays truthful.
function activityDayLabels() {
  const today = new Date();
  const labels: string[] = [];
  for (let i = ACTIVITY_WINDOW_DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }));
  }
  return labels;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/now').then((res) => res.json()),
      fetch('/api/tasks').then((res) => res.json()),
    ]).then(([nowData, tasksData]) => {
      setProjects(nowData.projects || []);
      setTasks(tasksData.tasks || []);
    });
  }, []);

  const stats = computeProjectStats(projects, tasks);
  const dayLabels = activityDayLabels();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <SectionHeader
        variant="page"
        icon={Briefcase}
        title="Project Radar"
        subtitle="Multiproject context switching and attention tracking"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map(({ project, activeCount, completedThisWeek, activitySeries }) => {
          const projTasks = tasks.filter((t) => t.project_id === project.id);

          return (
            <Card key={project.id} hover className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h2 className="text-base font-bold text-zinc-100 uppercase tracking-tight">
                      {project.name}
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{project.description}</p>
                </div>
                <Badge tone="good">{project.status}</Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span>{activeCount} open</span>
                  <span className="text-zinc-600">·</span>
                  <span className={completedThisWeek > 0 ? 'text-emerald-400' : ''}>{completedThisWeek} completed this week</span>
                </div>
                <Sparkline data={activitySeries} labels={dayLabels} />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-helm-border">
                {projTasks.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-[13px] text-zinc-300">
                    <span className="truncate max-w-[280px]">• {t.title}</span>
                    <span className="font-mono text-[10px] text-accent-400">{t.code || t.id}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
