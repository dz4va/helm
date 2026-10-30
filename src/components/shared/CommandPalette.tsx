'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Command, 
  Target, 
  CheckSquare, 
  Briefcase, 
  Calendar,
  BarChart3,
  Brain, 
  Plus, 
  X,
  FileText
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Projects';
  icon: any;
  action: () => void;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/tasks')
        .then((res) => res.json())
        .then((data) => setTasks(data.tasks || []))
        .catch((err) => console.error(err));
    }
  }, [isOpen]);

  const navigateTo = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const defaultCommands: CommandItem[] = [
    {
      id: 'nav-now',
      title: 'Go to NOW (Control Center)',
      category: 'Navigation',
      icon: Target,
      action: () => navigateTo('/'),
    },
    {
      id: 'nav-tasks',
      title: 'Go to Tasks',
      category: 'Navigation',
      icon: CheckSquare,
      action: () => navigateTo('/tasks'),
    },
    {
      id: 'nav-projects',
      title: 'Go to Projects Radar',
      category: 'Navigation',
      icon: Briefcase,
      action: () => navigateTo('/projects'),
    },
    {
      id: 'nav-calendar',
      title: 'Go to Work Capacity Calendar',
      category: 'Navigation',
      icon: Calendar,
      action: () => navigateTo('/calendar'),
    },
    {
      id: 'nav-analytics',
      title: 'Go to Analytics',
      category: 'Navigation',
      icon: BarChart3,
      action: () => navigateTo('/analytics'),
    },
    {
      id: 'nav-brain',
      title: 'Go to Knowledge Brain',
      category: 'Navigation',
      icon: Brain,
      action: () => navigateTo('/brain'),
    },
    {
      id: 'proj-all',
      title: 'Open Projects',
      category: 'Projects',
      icon: Briefcase,
      action: () => navigateTo('/projects'),
    },
  ];

  // Dynamic task search items
  const taskCommands: CommandItem[] = tasks.slice(0, 8).map((t) => ({
    id: `task-${t.id}`,
    title: `Task [${t.code || t.id}]: ${t.title}`,
    category: 'Actions',
    icon: FileText,
    action: () => {
      navigateTo('/tasks');
    },
  }));

  const allCommands = [...defaultCommands, ...taskCommands];

  const filteredCommands = allCommands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1 bg-helm-card hover:bg-helm-hover border border-helm-border hover:border-helm-borderStrong rounded text-zinc-400 hover:text-zinc-200 transition-colors duration-150 text-xs"
        title="Open Command Palette (Cmd+K)"
      >
        <Command className="w-3 h-3 text-zinc-400" />
        <span className="font-mono">⌘K Palette</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4 animate-in fade-in duration-200">
      <div className="bg-black/70 backdrop-blur-xl border border-helm-borderStrong rounded-xl w-full max-w-xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
        {/* Search Header Input */}
        <div className="p-3 border-b border-helm-border flex items-center gap-3">
          <Search className="w-4 h-4 text-accent-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search tasks/projects... (e.g. Tasks, Projects, NOW)"
            autoFocus
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-helm-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-helm-hover">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No matching commands or tasks found.
            </div>
          ) : (
            filteredCommands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <div
                  key={cmd.id}
                  onClick={cmd.action}
                  className="px-3 py-2.5 rounded-lg hover:bg-helm-hover flex items-center justify-between cursor-pointer group transition-colors duration-150 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-zinc-400 group-hover:text-accent-400 transition-colors duration-150" />
                    <span className="text-zinc-200 font-medium">{cmd.title}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-helm-bg text-zinc-500 border border-helm-border">
                    {cmd.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-helm-border bg-helm-bg flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <div className="flex items-center gap-2">
            <span>Press <kbd className="px-1 py-0.5 bg-helm-hover border border-helm-borderStrong rounded text-zinc-400">ESC</kbd> to close</span>
          </div>
          <div>HELM Command Hub</div>
        </div>
      </div>
    </div>
  );
}
