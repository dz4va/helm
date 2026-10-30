import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Subsequence fuzzy match: every character of `query` must appear in
// `text`, in order, with any characters allowed in between (case-insensitive).
export function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const char = q[qi];
    ti = t.indexOf(char, ti);
    if (ti === -1) return false;
    ti++;
  }
  return true;
}
