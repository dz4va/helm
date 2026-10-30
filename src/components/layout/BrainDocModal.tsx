'use client';

import React, { useEffect, useState } from 'react';
import { FileText, X } from 'lucide-react';

interface BrainDocModalProps {
  path: string | null;
  title: string;
  onClose: () => void;
}

// Deliberately not a full markdown parser (no new dependency for this) -
// just enough line-based handling (headings, lists, code fences, bold/inline
// code) to make these docs readable in-app instead of dumping raw text.
function renderMarkdownLite(content: string) {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let codeBuffer: string[] | null = null;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="list-disc pl-5 space-y-1 text-zinc-300">
        {listBuffer.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: inline(item) }} />
        ))}
      </ul>
    );
    listBuffer = [];
  };

  function inline(text: string) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-100 font-semibold">$1</strong>')
      .replace(/`(.+?)`/g, '<code class="bg-black/40 border border-helm-border rounded px-1 py-0.5 text-[12px] text-accent-300">$1</code>');
  }

  lines.forEach((line, idx) => {
    if (line.trim().startsWith('```')) {
      if (codeBuffer === null) {
        codeBuffer = [];
      } else {
        blocks.push(
          <pre key={`code-${idx}`} className="bg-black/40 border border-helm-border rounded-lg p-3 text-[12px] text-zinc-300 overflow-x-auto font-mono">
            {codeBuffer.join('\n')}
          </pre>
        );
        codeBuffer = null;
      }
      return;
    }
    if (codeBuffer !== null) {
      codeBuffer.push(line);
      return;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const sizes: Record<number, string> = {
        1: 'text-xl font-bold text-white mt-4',
        2: 'text-lg font-semibold text-white mt-4',
        3: 'text-base font-semibold text-zinc-100 mt-3',
        4: 'text-sm font-semibold text-zinc-200 mt-2',
      };
      blocks.push(
        <div key={`h-${idx}`} className={sizes[level] || sizes[4]} dangerouslySetInnerHTML={{ __html: inline(heading[2]) }} />
      );
      return;
    }

    const listItem = line.match(/^\s*[-*]\s+(.*)$/);
    if (listItem) {
      listBuffer.push(listItem[1]);
      return;
    }
    flushList();

    if (line.trim() === '') {
      blocks.push(<div key={`sp-${idx}`} className="h-2" />);
      return;
    }

    blocks.push(
      <p key={`p-${idx}`} className="text-[13px] leading-relaxed text-zinc-300" dangerouslySetInnerHTML={{ __html: inline(line) }} />
    );
  });
  flushList();

  return blocks;
}

export function BrainDocModal({ path, title, onClose }: BrainDocModalProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;
    setContent(null);
    setError(null);
    fetch(`/api/brain?path=${encodeURIComponent(path)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setContent(json.content);
      })
      .catch(() => setError('Failed to load document'));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [path]);

  if (!path) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-black/70 backdrop-blur-xl border border-helm-borderStrong rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl shadow-black/60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        <div className="p-5 border-b border-helm-border flex items-center justify-between bg-accent-500/5 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent-500 flex items-center justify-center text-white shadow-lg shadow-accent-500/30 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-0.5 truncate">{path}</div>
              <div className="text-lg font-semibold text-white truncate">{title}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-helm-hover transition-all duration-150 active:scale-95 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error ? (
            <div className="text-sm text-red-400">{error}</div>
          ) : content === null ? (
            <div className="text-xs text-zinc-500 py-10 text-center">Loading…</div>
          ) : (
            <div className="space-y-1">{renderMarkdownLite(content)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
