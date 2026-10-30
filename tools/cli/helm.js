#!/usr/bin/env node
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', '..', 'db', 'helm.db');
const sqlite = new Database(dbPath);

const args = process.argv.slice(2);
const command = args[0];
const subCommand = args[1];
const targetArg = args[2];

if (!command) {
  console.log(`
⚓ HELM Personal Work OS — CLI Interface

Usage:
  node tools/cli/helm.js tasks list
  node tools/cli/helm.js tasks get <code/id>
  node tools/cli/helm.js task complete <code/id>
  node tools/cli/helm.js focus today
  node tools/cli/helm.js progress
  `);
  process.exit(0);
}

if (command === 'tasks' && subCommand === 'list') {
  const rows = sqlite.prepare("SELECT id, code, title, status, priority, project_id FROM tasks WHERE status != 'completed' LIMIT 20").all();
  console.table(rows);
} else if ((command === 'task' || command === 'tasks') && subCommand === 'get') {
  const row = sqlite.prepare("SELECT * FROM tasks WHERE id = ? OR code = ?").get(targetArg, targetArg);
  console.log(row || 'Task not found');
} else if (command === 'task' && subCommand === 'complete') {
  const nowIso = new Date().toISOString();
  sqlite.prepare("UPDATE tasks SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ? OR code = ?").run(nowIso, nowIso, targetArg, targetArg);
  console.log(`✅ Marked task ${targetArg} as completed in SQLite helm.db.`);
} else if (command === 'focus' && subCommand === 'today') {
  const todayStr = new Date().toISOString().split('T')[0];
  const rows = sqlite.prepare(`
    SELECT df.position, t.code, t.title, t.priority, t.status 
    FROM daily_focus df 
    JOIN tasks t ON df.task_id = t.id 
    WHERE df.date = ? 
    ORDER BY df.position ASC
  `).all(todayStr);
  console.log(`🎯 Big 3 Focus for ${todayStr}:`);
  console.table(rows);
} else if (command === 'progress') {
  const row = sqlite.prepare("SELECT * FROM user_progress WHERE id = 'main'").get();
  console.log('⭐ User Progress:', row);
} else {
  console.log(`Unknown command: ${command} ${subCommand || ''}`);
}
