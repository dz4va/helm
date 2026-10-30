import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

// 1. Projects Table
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(), // slug or uuid e.g. "work"
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'), // active, maintenance, paused, completed, archived
  attention_state: text('attention_state').notNull().default('normal'), // normal, attention, blocked, overdue
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  archived_at: text('archived_at'),
  code_prefix: text('code_prefix'), // e.g. "SC" - drives auto-generated task codes like "SC-42"
  next_seq: integer('next_seq').notNull().default(1), // next number to use for this project's task codes
});

// 2. Tasks Table
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(), // e.g. "SC-18"
  project_id: text('project_id').references(() => projects.id),
  parent_task_id: text('parent_task_id'),
  code: text('code'), // e.g. "SC-18"
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('backlog'), // backlog, planned, active, waiting, blocked, completed, cancelled, archived
  priority: text('priority').notNull().default('medium'), // low, medium, high, urgent - urgency/importance, drives sorting only
  effort: text('effort').notNull().default('medium'), // trivial, small, medium, large - how much work it actually takes; drives completion XP (see lib/xp.ts)
  due_at: text('due_at'),
  scheduled_for: text('scheduled_for'),
  started_at: text('started_at'),
  completed_at: text('completed_at'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  recurring_task_id: text('recurring_task_id'), // set when this task was auto-materialized from a recurring definition
});

// 3. Task Dependencies
export const taskDependencies = sqliteTable('task_dependencies', {
  task_id: text('task_id').notNull().references(() => tasks.id),
  depends_on_task_id: text('depends_on_task_id').notNull().references(() => tasks.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.task_id, table.depends_on_task_id] }),
}));

// 4. Tags & Task Tags
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const taskTags = sqliteTable('task_tags', {
  task_id: text('task_id').notNull().references(() => tasks.id),
  tag_id: text('tag_id').notNull().references(() => tags.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.task_id, table.tag_id] }),
}));

// 5. Daily Focus Table (Replaces Markdown Big 3)
export const dailyFocus = sqliteTable('daily_focus', {
  id: text('id').primaryKey(),
  date: text('date').notNull(), // YYYY-MM-DD
  task_id: text('task_id').notNull().references(() => tasks.id),
  position: integer('position').notNull(), // 1, 2, or 3
  created_at: text('created_at').notNull(),
});

// 6. Inbox Table
export const inbox = sqliteTable('inbox', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  type: text('type').notNull().default('unknown'), // unknown, task, idea, note, reference, follow_up
  status: text('status').notNull().default('unprocessed'), // unprocessed, processed, archived
  project_id: text('project_id').references(() => projects.id),
  created_at: text('created_at').notNull(),
  processed_at: text('processed_at'),
});

// 7. Activity Event Stream Table
export const activity = sqliteTable('activity', {
  id: text('id').primaryKey(),
  entity_type: text('entity_type').notNull(), // task, focus, project, review, note
  entity_id: text('entity_id').notNull(),
  event_type: text('event_type').notNull(), // created, completed, started, rescheduled, selected
  metadata_json: text('metadata_json'),
  created_at: text('created_at').notNull(),
});

// 8. XP Transactions Table
export const xpTransactions = sqliteTable('xp_transactions', {
  id: text('id').primaryKey(),
  source_event_id: text('source_event_id').references(() => activity.id),
  amount: integer('amount').notNull(),
  reason: text('reason').notNull(),
  created_at: text('created_at').notNull(),
});

// 9. User Progress / Gamification Table
export const userProgress = sqliteTable('user_progress', {
  id: text('id').primaryKey(), // "main"
  level: integer('level').notNull().default(1),
  total_xp: integer('total_xp').notNull().default(0),
  current_streak: integer('current_streak').notNull().default(0),
  longest_streak: integer('longest_streak').notNull().default(0),
  badges_json: text('badges_json').notNull().default('[]'),
  updated_at: text('updated_at').notNull(),
});

// 10. Daily Active Time Table (tracks how long the user is actively on the app, per day)
export const dailyActiveTime = sqliteTable('daily_active_time', {
  date: text('date').primaryKey(), // YYYY-MM-DD
  active_seconds: integer('active_seconds').notNull().default(0),
  updated_at: text('updated_at').notNull(),
});

// 11. Recurring Task Definitions (materialized into `tasks` automatically -
// see rehydrateRecurringTasks() in api/now/route.ts)
export const recurringTasks = sqliteTable('recurring_tasks', {
  id: text('id').primaryKey(),
  project_id: text('project_id').references(() => projects.id),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority').notNull().default('medium'),
  effort: text('effort').notNull().default('medium'), // trivial, small, medium, large - inherited by each materialized task instance
  schedule_type: text('schedule_type').notNull().default('daily'), // daily, weekly, monthly
  weekdays_json: text('weekdays_json'), // e.g. '[1,2,3,4,5]' (0=Sun..6=Sat), used when schedule_type='weekly'
  month_days_json: text('month_days_json'), // e.g. '[1,15]', used when schedule_type='monthly'
  time_of_day: text('time_of_day'), // 'HH:MM' 24h, nullable - trigger time for list-add + notification
  end_date: text('end_date'), // 'YYYY-MM-DD', nullable = no end date
  active: integer('active').notNull().default(1),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});
