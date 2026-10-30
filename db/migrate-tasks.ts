import fs from 'fs';
import path from 'path';
import { db } from './client';
import { projects, tasks, dailyFocus, userProgress, activity, xpTransactions } from './schema';
import { eq } from 'drizzle-orm';

const isDryRun = process.argv.includes('--dry-run');
const isCommit = process.argv.includes('--commit') || !isDryRun;

console.log(`🚀 Starting Helm Migration Script (${isDryRun ? 'DRY-RUN' : 'COMMIT MODE'})...`);

const workspaceRoot = path.join(__dirname, '..');
const tasksPath = path.join(workspaceRoot, 'TASKS.md');
const xpPath = path.join(workspaceRoot, '.xp_store');

// 1. Initial Projects Seed Data — generic starter set, rename/edit freely
// before your first `npm run db:migrate` run, or manage projects later via
// the dashboard UI / API instead of editing this file.
const DEFAULT_PROJECTS = [
  { id: 'work', slug: 'work', name: 'Work', description: 'Day job tasks and projects', status: 'active', attention_state: 'normal' },
  { id: 'freelance', slug: 'freelance', name: 'Freelance', description: 'Client/contract work', status: 'active', attention_state: 'normal' },
  { id: 'side-project', slug: 'side-project', name: 'Side Project', description: 'Personal or side projects', status: 'active', attention_state: 'normal' },
  { id: 'general', slug: 'general', name: 'General', description: 'General operational & miscellaneous tasks', status: 'active', attention_state: 'normal' },
];

if (isCommit) {
  for (const proj of DEFAULT_PROJECTS) {
    const existing = db.select().from(projects).where(eq(projects.id, proj.id)).get();
    if (!existing) {
      db.insert(projects).values({
        ...proj,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).run();
    }
  }
}

// Helper to determine project ID from task text or code when importing an
// optional legacy TASKS.md. Customize this if you rename DEFAULT_PROJECTS
// above and want keyword-based routing during import.
function getProjectId(_code: string, _text: string): string {
  return 'general';
}

let migratedTasksCount = 0;
let big3Count = 0;
const todayStr = new Date().toISOString().split('T')[0];

if (fs.existsSync(tasksPath)) {
  const content = fs.readFileSync(tasksPath, 'utf8');
  const sections = content.split('## ').slice(1);

  sections.forEach((section, sectionIdx) => {
    const lines = section.split('\n');
    const title = lines[0].trim();
    const isBig3Section = sectionIdx === 0 || title.includes('Active Focus');

    const taskLines = lines.slice(1).filter(l => l.trim().startsWith('- [ ]') || l.trim().startsWith('- [x]'));

    taskLines.forEach((l, idx) => {
      const completed = l.includes('[x]');
      const rawText = l.replace(/- \[[x ]\] /, '').trim();

      // Extract Task ID e.g. **SC-18**: Title
      const codeMatch = rawText.match(/\*\*(.*?)\*\*/);
      const code = codeMatch ? codeMatch[1] : `TASK-${migratedTasksCount + 1}`;
      
      let cleanTitle = rawText.replace(/\*\*.*?\*\*:?/, '').trim();
      
      // Determine priority
      let priority = 'medium';
      if (rawText.includes('#Urgent') || rawText.toLowerCase().includes('urgent')) priority = 'urgent';
      else if (rawText.toLowerCase().includes('high')) priority = 'high';
      else if (rawText.toLowerCase().includes('low')) priority = 'low';

      // Clean tags from title
      cleanTitle = cleanTitle
        .replace(/\[Area:.*?\]/, '')
        .replace(/#\w+/g, '')
        .replace(/\[XP:.*?\]/, '')
        .replace(/\(\d{4}-\d{2}-\d{2}\)/, '')
        .trim();

      const projId = getProjectId(code, rawText);
      const status = completed ? 'completed' : (isBig3Section ? 'active' : 'planned');

      migratedTasksCount++;

      if (isCommit) {
        // Insert task
        db.insert(tasks).values({
          id: code,
          project_id: projId,
          code: code,
          title: cleanTitle || rawText,
          description: rawText,
          status: status,
          priority: priority,
          completed_at: completed ? new Date().toISOString() : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).onConflictDoUpdate({
          target: tasks.id,
          set: {
            title: cleanTitle || rawText,
            status: status,
            priority: priority,
            updated_at: new Date().toISOString(),
          }
        }).run();

        // If in Big 3 section and not completed, add to daily_focus
        if (isBig3Section && !completed && big3Count < 3) {
          big3Count++;
          const focusId = `focus-${todayStr}-${big3Count}`;
          db.insert(dailyFocus).values({
            id: focusId,
            date: todayStr,
            task_id: code,
            position: big3Count,
            created_at: new Date().toISOString(),
          }).onConflictDoNothing().run();
        }
      }
    });
  });
}

// 2. Migrate XP Store Data
let xpData = { total_xp: 0, level: 1, streak: 0, badges: [] };
if (fs.existsSync(xpPath)) {
  try {
    xpData = JSON.parse(fs.readFileSync(xpPath, 'utf8'));
  } catch (e) {
    console.error('Error reading .xp_store:', e);
  }
}

if (isCommit) {
  db.insert(userProgress).values({
    id: 'main',
    level: xpData.level || 1,
    total_xp: xpData.total_xp || 0,
    current_streak: xpData.streak || 0,
    longest_streak: xpData.streak || 0,
    badges_json: JSON.stringify(xpData.badges || []),
    updated_at: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: userProgress.id,
    set: {
      level: xpData.level || 1,
      total_xp: xpData.total_xp || 0,
      current_streak: xpData.streak || 0,
      badges_json: JSON.stringify(xpData.badges || []),
      updated_at: new Date().toISOString(),
    }
  }).run();
}

console.log(`✅ Migration complete!`);
console.log(`- Tasks migrated: ${migratedTasksCount}`);
console.log(`- Daily Focus (Big 3) populated: ${big3Count}`);
console.log(`- User XP: ${xpData.total_xp} (Level ${xpData.level}, Streak ${xpData.streak})`);
