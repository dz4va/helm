import {
  Target,
  CheckSquare,
  Briefcase,
  Calendar,
  BarChart3,
  Brain,
  Repeat,
} from 'lucide-react';

export const NAV_ITEMS = [
  { name: 'Now', href: '/', icon: Target },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Recurring', href: '/recurring-tasks', icon: Repeat },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Brain', href: '/brain', icon: Brain },
];
