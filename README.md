# HELM — Personal Work OS

HELM is a local-first task & project dashboard: a Next.js 14 (App Router,
TypeScript, Tailwind) web app backed by a SQLite database (via Drizzle ORM),
plus a small CLI for querying it from the terminal or from an AI coding
assistant (Claude Code, Codex, etc).

It's designed as a personal command center: projects, tasks, a daily "Big 3"
focus list, an inbox, an activity feed, and a lightweight XP/level/streak
gamification layer.

![stack](https://img.shields.io/badge/next.js-14-black) ![stack](https://img.shields.io/badge/sqlite-drizzle-blue) ![stack](https://img.shields.io/badge/license-personal%20use-lightgrey)

## Quick start

Requires **Node.js 18+** and npm.

```bash
npm install
npm run dev
```

The app serves on **http://localhost:7777**. On first run, `db/helm.db` is
created automatically with an empty schema (see `db/client.ts` — it runs
`CREATE TABLE IF NOT EXISTS` for every table on boot, plus additive
migrations for older schemas).

### Seed default projects

A fresh database has no projects. Seed a generic starter set (Work,
Freelance, Side Project, General) with:

```bash
npm run db:migrate
```

This only seeds projects if a `TASKS.md` / `.xp_store` file isn't present at
the repo root (they aren't, in a fresh clone) — it's safe to run on a brand
new database. Rename/add projects afterwards from the dashboard UI, the API,
or by editing `db/migrate-tasks.ts`'s `DEFAULT_PROJECTS` list before running
it.

### Using the CLI

```bash
node tools/cli/helm.js tasks list
node tools/cli/helm.js tasks get <code>
node tools/cli/helm.js task complete <code>
node tools/cli/helm.js focus today
node tools/cli/helm.js progress
```

## Project structure

```
src/app/            Next.js App Router pages (Now, Tasks, Projects, Calendar, Reviews, Analytics, Brain)
src/app/api/         API routes (/api/now, /api/tasks, ...)
src/components/      UI components
src/lib/             Shared helpers (XP math, time/date utils, project stats)
db/schema.ts         Drizzle schema
db/client.ts         SQLite connection + schema bootstrap/migrations
db/migrate-tasks.ts  One-time seed/import script (projects + optional TASKS.md import)
tools/cli/helm.js    Terminal CLI (no server required — reads db/helm.db directly)
.agent/HELM.md       Data-model & API conventions for AI agents working in this repo
.agent/UI_RULES.md   Visual/UX conventions (dark-mode command-center style)
.claude/skills/      Claude Code skill(s) for this project (see below)
```

## Data model

Tables (in `db/schema.ts`): `projects`, `tasks`, `task_dependencies`,
`tags`/`task_tags`, `daily_focus` (the "Big 3"), `inbox`, `activity` (event
stream), `xp_transactions`, `user_progress` (level/streak/badges),
`recurring_tasks`.

**Ownership rule:** SQLite is the only canonical store for this structured
data. Never hand-edit `db/helm.db` with raw `INSERT`/`UPDATE` SQL — always go
through the API (`/api/tasks`, action `create_task` / `toggle_complete`) or
the CLI, so activity-log and XP side effects stay consistent. Markdown files
are fine for separate long-form notes (specs, decision logs) but aren't part
of Helm's own data layer.

## Running it with an AI coding assistant

This repo ships agent-facing docs so an assistant can operate Helm
correctly without guessing at conventions:

- **`AGENTS.md`** — generic agent instructions (works with Codex, Claude
  Code, or any assistant that reads `AGENTS.md`).
- **`CLAUDE.md`** — Claude Code entry point; it just imports `AGENTS.md`.
- **`.agent/HELM.md`** — the data model, task-creation conventions (API
  request shape, project IDs, Jira-style auto-generated codes like
  `SC-41`), and the "never hand-edit the DB" rule.
- **`.agent/UI_RULES.md`** — visual/UX conventions if the assistant is
  asked to touch the frontend (dark-mode-first, Linear/Raycast-style
  density, keyboard-first).

### Claude Code skill

`.claude/skills/helm-add-tasks/SKILL.md` is a skill for turning a raw,
shorthand list of tasks/bugs (e.g. pasted from a client message) into
clean, synthesized tasks filed via the API. With Claude Code pointed at
this repo, it's picked up automatically — just ask something like "log
these three bugs for Freelance" and it does the rest (resolving the project
id, writing a clean title/description/priority per task, and POSTing to
`/api/tasks`).

If you use Codex or another assistant instead, the same recipe is plain
Markdown — it reads like a runbook and works as a one-off prompt even
without Claude Code's skill-loading mechanism.

## Notes

No database is included — `db/helm.db` is created fresh (and gitignored)
on first run. Run `npm run db:migrate` once to seed starter projects, then
start adding your own tasks.
