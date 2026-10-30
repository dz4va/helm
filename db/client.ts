import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.HELM_DB_PATH || path.join(process.cwd(), 'db', 'helm.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

// Initialize database schema tables if not created yet
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    attention_state TEXT NOT NULL DEFAULT 'normal',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    parent_task_id TEXT,
    code TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    priority TEXT NOT NULL DEFAULT 'medium',
    effort TEXT NOT NULL DEFAULT 'medium',
    due_at TEXT,
    scheduled_for TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS task_dependencies (
    task_id TEXT NOT NULL REFERENCES tasks(id),
    depends_on_task_id TEXT NOT NULL REFERENCES tasks(id),
    PRIMARY KEY (task_id, depends_on_task_id)
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS task_tags (
    task_id TEXT NOT NULL REFERENCES tasks(id),
    tag_id TEXT NOT NULL REFERENCES tags(id),
    PRIMARY KEY (task_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS daily_focus (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inbox (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'unknown',
    status TEXT NOT NULL DEFAULT 'unprocessed',
    project_id TEXT REFERENCES projects(id),
    created_at TEXT NOT NULL,
    processed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS xp_transactions (
    id TEXT PRIMARY KEY,
    source_event_id TEXT REFERENCES activity(id),
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    id TEXT PRIMARY KEY,
    level INTEGER NOT NULL DEFAULT 1,
    total_xp INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    badges_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daily_active_time (
    date TEXT PRIMARY KEY,
    active_seconds INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS recurring_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    effort TEXT NOT NULL DEFAULT 'medium',
    schedule_type TEXT NOT NULL DEFAULT 'daily',
    weekdays_json TEXT,
    month_days_json TEXT,
    time_of_day TEXT,
    end_date TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const taskCols = new Set(
  (sqlite.prepare(`PRAGMA table_info(tasks)`).all() as { name: string }[]).map((c) => c.name)
);
if (!taskCols.has('recurring_task_id')) {
  sqlite.exec(`ALTER TABLE tasks ADD COLUMN recurring_task_id TEXT`);
}
if (!taskCols.has('effort')) {
  // Existing rows (including completed/archived ones) backfill to 'medium'.
  // This is safe: completion XP is only computed at the moment a task
  // transitions to 'completed' (see awardCompletionXp), so already-completed
  // or archived tasks never get re-awarded XP off this backfilled value.
  sqlite.exec(`ALTER TABLE tasks ADD COLUMN effort TEXT NOT NULL DEFAULT 'medium'`);
}

// Lightweight additive migration: SQLite's ADD COLUMN never touches existing
// rows/data, so this is safe to run on every boot against a pre-existing DB.
const projectCols = new Set(
  (sqlite.prepare(`PRAGMA table_info(projects)`).all() as { name: string }[]).map((c) => c.name)
);
if (!projectCols.has('code_prefix')) {
  sqlite.exec(`ALTER TABLE projects ADD COLUMN code_prefix TEXT`);
}
if (!projectCols.has('next_seq')) {
  sqlite.exec(`ALTER TABLE projects ADD COLUMN next_seq INTEGER NOT NULL DEFAULT 1`);
}

// One-time backfill of code_prefix/next_seq from each project's existing
// Jira-style codes (e.g. "WRK-41" -> prefix "WRK", next_seq 42). Guarded by
// `code_prefix IS NULL` so it only ever runs once per project. Add an entry
// here per project id if you want Jira-style codes instead of the
// TASK-<timestamp> fallback.
const KNOWN_PREFIXES: Record<string, string> = {
  work: 'WRK',
  freelance: 'FL',
  'side-project': 'SP',
};
const maxCodeStmt = sqlite.prepare(
  `SELECT code FROM tasks WHERE project_id = ? AND code LIKE ? ORDER BY CAST(substr(code, instr(code, '-') + 1) AS INTEGER) DESC LIMIT 1`
);
const backfillStmt = sqlite.prepare(
  `UPDATE projects SET code_prefix = ?, next_seq = ? WHERE id = ? AND code_prefix IS NULL`
);
for (const [projectId, prefix] of Object.entries(KNOWN_PREFIXES)) {
  const maxRow = maxCodeStmt.get(projectId, `${prefix}-%`) as { code: string } | undefined;
  const maxNum = maxRow ? parseInt(maxRow.code.split('-')[1], 10) || 0 : 0;
  backfillStmt.run(prefix, maxNum + 1, projectId);
}

// Additive migration for recurring_tasks: the table was created with an
// earlier, simpler shape (cadence: 'daily' | 'weekdays' only) before the
// richer scheduling model (weekday/month-day/time-of-day/end-date) existed.
const recurringCols = new Set(
  (sqlite.prepare(`PRAGMA table_info(recurring_tasks)`).all() as { name: string }[]).map((c) => c.name)
);
if (!recurringCols.has('schedule_type')) {
  sqlite.exec(`ALTER TABLE recurring_tasks ADD COLUMN schedule_type TEXT NOT NULL DEFAULT 'daily'`);
  // Preserve old cadence='weekdays' defs as the equivalent weekly Mon-Fri schedule.
  sqlite.exec(`UPDATE recurring_tasks SET schedule_type = 'weekly', weekdays_json = '[1,2,3,4,5]' WHERE cadence = 'weekdays'`);
}
if (!recurringCols.has('weekdays_json')) {
  sqlite.exec(`ALTER TABLE recurring_tasks ADD COLUMN weekdays_json TEXT`);
}
if (!recurringCols.has('month_days_json')) {
  sqlite.exec(`ALTER TABLE recurring_tasks ADD COLUMN month_days_json TEXT`);
}
if (!recurringCols.has('time_of_day')) {
  sqlite.exec(`ALTER TABLE recurring_tasks ADD COLUMN time_of_day TEXT`);
}
if (!recurringCols.has('end_date')) {
  sqlite.exec(`ALTER TABLE recurring_tasks ADD COLUMN end_date TEXT`);
}
if (!recurringCols.has('updated_at')) {
  sqlite.exec(`ALTER TABLE recurring_tasks ADD COLUMN updated_at TEXT`);
  sqlite.exec(`UPDATE recurring_tasks SET updated_at = created_at WHERE updated_at IS NULL`);
}
if (!recurringCols.has('effort')) {
  sqlite.exec(`ALTER TABLE recurring_tasks ADD COLUMN effort TEXT NOT NULL DEFAULT 'medium'`);
}

export const db = drizzle(sqlite, { schema });
export { sqlite };
