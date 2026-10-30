'use client';

import React, { useEffect, useState } from 'react';
import { Brain, Search, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { BrainDocModal } from '@/components/layout/BrainDocModal';

interface KnowledgeItem {
  path: string;
  title: string;
  area: string;
  type: string;
  date: string;
}

export default function BrainPage() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDoc, setOpenDoc] = useState<KnowledgeItem | null>(null);

  useEffect(() => {
    fetch('/api/brain')
      .then((res) => res.json())
      .then((json) => setItems(json.items || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(item =>
    !query ||
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.area.toLowerCase().includes(query.toLowerCase()) ||
    item.path.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionHeader
        variant="page"
        icon={Brain}
        title="Knowledge Brain"
        subtitle="Markdown documents, architecture specs, decisions, and knowledge base search"
      />

      {/* Global Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search specs, decisions, architecture notes, project files..."
          className="w-full bg-helm-card border border-helm-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30"
        />
      </div>

      {/* Knowledge Documents List */}
      <Card padding="lg" className="space-y-4">
        <SectionHeader title={`Indexed Markdown Knowledge Files (${items.length})`} />
        <div className="space-y-2">
          {loading ? (
            <div className="text-xs text-zinc-500 py-10 text-center">Scanning kb/ and areas/…</div>
          ) : filtered.length === 0 ? (
            <EmptyState label="No knowledge files match your search." />
          ) : (
            filtered.map((item) => (
              <div
                key={item.path}
                onClick={() => setOpenDoc(item)}
                className="p-3 bg-helm-hover border border-helm-borderStrong hover:border-accent-500/50 rounded flex items-center justify-between transition-colors duration-150 cursor-pointer text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-accent-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-200 text-[13px] truncate">{item.title}</div>
                    <div className="text-[10px] text-zinc-400 truncate">{item.area}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge tone="info">{item.type}</Badge>
                  <span className="text-[10px] text-zinc-500">{item.date}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <BrainDocModal
        path={openDoc?.path || null}
        title={openDoc?.title || ''}
        onClose={() => setOpenDoc(null)}
      />
    </div>
  );
}
