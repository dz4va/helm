import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// The "Second Brain" workspace root is one level up from the helm/ app dir.
const WORKSPACE_ROOT = path.resolve(process.cwd(), '..');
const SCAN_DIRS = ['kb', 'areas'];

function humanize(segment: string) {
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferType(relPath: string) {
  const base = path.basename(relPath).toLowerCase();
  if (base === 'context.md') return 'Context';
  if (base === 'log.md') return 'Log';
  if (base === 'template.md') return 'Template';
  if (relPath.includes('meeting-notes')) return 'Meeting Notes';
  if (relPath.includes('decisions')) return 'Decision';
  if (relPath.includes('reports')) return 'Report';
  if (relPath.includes('docs')) return 'Spec';
  if (relPath.includes('support-logs')) return 'Support Log';
  return 'Note';
}

function inferArea(relPath: string) {
  const dir = path.dirname(relPath);
  const segments = dir.split(path.sep).filter((s) => s !== '.' && s !== 'kb' && s !== 'areas');
  if (segments.length === 0) return relPath.startsWith('kb') ? 'Knowledge Base' : 'General';
  return segments.map(humanize).join(' / ');
}

function extractTitle(content: string, fallbackName: string) {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();
  return humanize(fallbackName.replace(/\.md$/i, ''));
}

function walk(dirAbs: string, dirRel: string, results: string[]) {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const childAbs = path.join(dirAbs, entry.name);
    const childRel = path.join(dirRel, entry.name);
    if (entry.isDirectory()) {
      walk(childAbs, childRel, results);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      results.push(childRel);
    }
  }
}

function resolveSafe(relPath: string): string | null {
  const resolved = path.resolve(WORKSPACE_ROOT, relPath);
  const isInsideScanDir = SCAN_DIRS.some((dir) => {
    const dirAbs = path.resolve(WORKSPACE_ROOT, dir);
    return resolved === dirAbs || resolved.startsWith(dirAbs + path.sep);
  });
  if (!isInsideScanDir) return null;
  return resolved;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('path');

  if (filePath) {
    const resolved = resolveSafe(filePath);
    if (!resolved || !resolved.toLowerCase().endsWith('.md')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    try {
      const content = fs.readFileSync(resolved, 'utf-8');
      return NextResponse.json({ path: filePath, content });
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  }

  const relFiles: string[] = [];
  for (const dir of SCAN_DIRS) {
    walk(path.resolve(WORKSPACE_ROOT, dir), dir, relFiles);
  }

  const items = relFiles.map((relPath) => {
    const abs = path.resolve(WORKSPACE_ROOT, relPath);
    let mtime = new Date().toISOString();
    let content = '';
    try {
      const stat = fs.statSync(abs);
      mtime = stat.mtime.toISOString();
      content = fs.readFileSync(abs, 'utf-8');
    } catch {
      // ignore unreadable file, still list it with defaults
    }
    return {
      path: relPath,
      title: extractTitle(content, path.basename(relPath)),
      area: inferArea(relPath),
      type: inferType(relPath),
      date: mtime.split('T')[0],
    };
  });

  items.sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({ items });
}
