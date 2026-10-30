'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/navigation';

export default function HeaderTitle() {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((item) => item.href === pathname);
  if (!current) return null;

  const Icon = current.icon;
  return (
    <div className="flex items-center gap-1.5 text-zinc-300">
      <Icon className="w-3.5 h-3.5 text-accent-400" />
      <span className="font-medium text-zinc-200">{current.name}</span>
    </div>
  );
}
