require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDb } = require('./db');
const { runMigrations } = require('./migrate');

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

// Date helpers — today is treated as relative anchor
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function weeksAgo(n) { return daysAgo(n * 7); }
function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

// Get Mon of the week containing a date string
function weekStart(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function seed() {
  console.log('Running migrations before seed...');
  runMigrations();

  const db = getDb();

  // Clear in dependency order
  db.exec(`
    DELETE FROM feature_suggestions;
    DELETE FROM audit_log;
    DELETE FROM time_entries;
    DELETE FROM project_assignments;
    DELETE FROM projects;
    DELETE FROM users;
  `);

  console.log('Seeding users...');
  const adminHash = await bcrypt.hash('Admin1234', ROUNDS);
  const tempHash = await bcrypt.hash('Temp1234!', ROUNDS);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, is_active, is_first_login)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Admin
  const adminId = insertUser.run('Jakub Pechoucek', 'jakub.pechoucek@homecredit.ph', adminHash, 'admin', 1, 0).lastInsertRowid;

  // PMs
  const pm1Id = insertUser.run('Maria Santos', 'maria.santos@hc.ph', tempHash, 'pm', 0, 1).lastInsertRowid; // deactivated
  const pm2Id = insertUser.run('Juan dela Cruz', 'juan.delacruz@hc.ph', tempHash, 'pm', 1, 1).lastInsertRowid;
  const pm3Id = insertUser.run('Ana Reyes', 'ana.reyes@hc.ph', tempHash, 'pm', 1, 1).lastInsertRowid;
  const pm4Id = insertUser.run('Carlos Mendoza', 'carlos.mendoza@hc.ph', tempHash, 'pm', 1, 1).lastInsertRowid;
  const pm5Id = insertUser.run('Rosa Lim', 'rosa.lim@hc.ph', tempHash, 'pm', 1, 1).lastInsertRowid;

  console.log('Seeding projects...');
  const insertProject = db.prepare(`
    INSERT INTO projects (name, description, budget_hours, billable, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const p1Id = insertProject.run('HC Mobile App', 'Consumer-facing mobile application redesign', 500, 1, 'active').lastInsertRowid;
  const p2Id = insertProject.run('Customer Portal', 'Self-service web portal for loan management', 300, 1, 'active').lastInsertRowid;
  const p3Id = insertProject.run('Internal Tools', 'Internal productivity and automation tooling', 200, 0, 'active').lastInsertRowid;
  const p4Id = insertProject.run('Data Analytics Platform', 'BI dashboards and data pipeline infrastructure', 400, 1, 'active').lastInsertRowid;
  const p5Id = insertProject.run('Legacy System Migration', 'Migration of core lending system to microservices', 600, 1, 'active').lastInsertRowid;
  const p6Id = insertProject.run('Office Automation', 'Internal process automation — completed and archived', 150, 0, 'archived').lastInsertRowid;

  console.log('Seeding assignments...');
  const insertAssignment = db.prepare(`
    INSERT INTO project_assignments (pm_id, project_id, assigned_from, assigned_to)
    VALUES (?, ?, ?, ?)
  `);

  // Maria (deactivated) — historical assignments, ended when deactivated
  insertAssignment.run(pm1Id, p6Id, monthsAgo(6), monthsAgo(2));
  insertAssignment.run(pm1Id, p1Id, monthsAgo(5), monthsAgo(2));

  // Juan — two active projects
  insertAssignment.run(pm2Id, p1Id, monthsAgo(5), null);
  insertAssignment.run(pm2Id, p2Id, monthsAgo(4), null);

  // Ana — one ended, one active
  insertAssignment.run(pm3Id, p2Id, monthsAgo(4), null);
  insertAssignment.run(pm3Id, p4Id, monthsAgo(3), null);

  // Carlos — two active
  insertAssignment.run(pm4Id, p5Id, monthsAgo(6), null);
  insertAssignment.run(pm4Id, p3Id, monthsAgo(3), null);

  // Rosa — two active
  insertAssignment.run(pm5Id, p4Id, monthsAgo(3), null);
  insertAssignment.run(pm5Id, p1Id, monthsAgo(2), null);

  console.log('Seeding time entries...');
  const insertEntry = db.prepare(`
    INSERT INTO time_entries (pm_id, project_id, date, hours, category, description, status, approved_by, approved_at, rejection_reason, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  const categories = ['Planning', 'Meetings', 'Reporting', 'Problem Solving', 'Documentation', 'Other'];

  // ── JUAN ── (HC Mobile App + Customer Portal)
  // 3 months ago — fully approved week (edge case: approved timesheet)
  const juanApprovedWeekStart = weekStart(monthsAgo(12 * 7));
  for (let d = 0; d < 5; d++) {
    const date = addDays(juanApprovedWeekStart, d);
    insertEntry.run(pm2Id, p1Id, date, 4, categories[d % 6], 'Sprint planning and dev work', 'approved', adminId, now, null, addDays(juanApprovedWeekStart, 5));
    insertEntry.run(pm2Id, p2Id, date, 3.5, 'Meetings', 'Stakeholder alignment meeting', 'approved', adminId, now, null, addDays(juanApprovedWeekStart, 5));
  }

  // 2 months ago — partially approved
  const juanPartialWeekStart = weekStart(monthsAgo(8 * 7));
  for (let d = 0; d < 5; d++) {
    const date = addDays(juanPartialWeekStart, d);
    insertEntry.run(pm2Id, p1Id, date, 5, 'Planning', 'Feature scoping session', 'approved', adminId, now, null, addDays(juanPartialWeekStart, 5));
    insertEntry.run(pm2Id, p2Id, date, 3, 'Reporting', 'Weekly status report', 'pending', null, null, null, addDays(juanPartialWeekStart, 5));
  }

  // Last week — EDGE CASE: daily total exceeds 8h (warning) and one day exceeds 12h
  const lastMon = weekStart(daysAgo(7));
  // Monday: 9.5h (warning >8h)
  insertEntry.run(pm2Id, p1Id, lastMon, 5.5, 'Planning', 'Q2 roadmap planning', 'pending', null, null, null, addDays(lastMon, 5));
  insertEntry.run(pm2Id, p2Id, lastMon, 4, 'Meetings', 'Stakeholder review meeting', 'pending', null, null, null, addDays(lastMon, 5));
  // Tuesday: 8h normal
  insertEntry.run(pm2Id, p1Id, addDays(lastMon, 1), 4, 'Problem Solving', 'Bug triage and hotfix', 'pending', null, null, null, addDays(lastMon, 5));
  insertEntry.run(pm2Id, p2Id, addDays(lastMon, 1), 4, 'Documentation', 'API documentation update', 'pending', null, null, null, addDays(lastMon, 5));
  // Wednesday: 13h (red, >12h — edge case)
  insertEntry.run(pm2Id, p1Id, addDays(lastMon, 2), 8, 'Problem Solving', 'Critical production incident response', 'pending', null, null, null, addDays(lastMon, 5));
  insertEntry.run(pm2Id, p2Id, addDays(lastMon, 2), 5, 'Meetings', 'Emergency stakeholder calls', 'pending', null, null, null, addDays(lastMon, 5));
  // Thu-Fri: normal
  insertEntry.run(pm2Id, p1Id, addDays(lastMon, 3), 4, 'Reporting', 'Sprint retrospective report', 'pending', null, null, null, addDays(lastMon, 5));
  insertEntry.run(pm2Id, p2Id, addDays(lastMon, 4), 3.5, 'Planning', 'Next sprint planning', 'pending', null, null, null, addDays(lastMon, 5));

  // This week — draft entries
  const thisMon = weekStart(daysAgo(0));
  insertEntry.run(pm2Id, p1Id, thisMon, 4, 'Planning', 'Sprint kickoff', 'draft', null, null, null, null);
  insertEntry.run(pm2Id, p2Id, thisMon, 3, 'Meetings', 'Client alignment', 'draft', null, null, null, null);
  if (addDays(thisMon, 1) <= daysAgo(0)) {
    insertEntry.run(pm2Id, p1Id, addDays(thisMon, 1), 4.5, 'Problem Solving', 'Technical spike', 'draft', null, null, null, null);
  }

  // ── ANA ── (Customer Portal + Data Analytics)
  // Rejected timesheet — edge case
  const anaRejectedWeekStart = weekStart(monthsAgo(6 * 7));
  for (let d = 0; d < 5; d++) {
    const date = addDays(anaRejectedWeekStart, d);
    insertEntry.run(pm3Id, p2Id, date, 6, 'Reporting', 'Monthly report preparation', 'rejected', null, null, 'Hours exceed project scope for this period. Please review and resubmit.', addDays(anaRejectedWeekStart, 5));
    insertEntry.run(pm3Id, p4Id, date, 2, 'Planning', 'Analytics roadmap review', 'rejected', null, null, 'Insufficient description provided. Add more detail.', addDays(anaRejectedWeekStart, 5));
  }

  // 6 weeks ago — approved
  const anaApprovedWeek = weekStart(monthsAgo(6 * 7 - 7));
  for (let d = 0; d < 5; d++) {
    const date = addDays(anaApprovedWeek, d);
    insertEntry.run(pm3Id, p2Id, date, 4, categories[d % 6], 'Portal feature development', 'approved', adminId, now, null, addDays(anaApprovedWeek, 5));
    insertEntry.run(pm3Id, p4Id, date, 3, 'Documentation', 'Dashboard specifications', 'approved', adminId, now, null, addDays(anaApprovedWeek, 5));
  }

  // Recent weeks — mix of pending and draft
  for (let w = 1; w <= 3; w++) {
    const wStart = weekStart(daysAgo(w * 7));
    for (let d = 0; d < 5; d++) {
      const date = addDays(wStart, d);
      if (w > 1) {
        insertEntry.run(pm3Id, p2Id, date, 4.5, categories[d % 6], 'Portal development tasks', 'pending', null, null, null, addDays(wStart, 5));
        insertEntry.run(pm3Id, p4Id, date, 3, 'Planning', 'Analytics sprint tasks', 'pending', null, null, null, addDays(wStart, 5));
      } else {
        insertEntry.run(pm3Id, p2Id, date, 4, 'Meetings', 'Weekly sync', 'draft', null, null, null, null);
      }
    }
  }

  // ── CARLOS ── (Legacy Migration + Internal Tools)
  // Mix across 3 months
  for (let w = 1; w <= 11; w++) {
    const wStart = weekStart(daysAgo(w * 7));
    const status = w > 4 ? 'pending' : 'approved';
    const submittedAt = addDays(wStart, 5);
    for (let d = 0; d < 5; d++) {
      const date = addDays(wStart, d);
      insertEntry.run(pm4Id, p5Id, date, 5, categories[(w + d) % 6], 'Migration tasks and testing', status, status === 'approved' ? adminId : null, status === 'approved' ? now : null, null, submittedAt);
      if (d % 2 === 0) {
        insertEntry.run(pm4Id, p3Id, date, 2.5, 'Documentation', 'Internal tooling docs', status, status === 'approved' ? adminId : null, status === 'approved' ? now : null, null, submittedAt);
      }
    }
  }

  // This week — Carlos drafts
  insertEntry.run(pm4Id, p5Id, thisMon, 6, 'Planning', 'Architecture review', 'draft', null, null, null, null);
  insertEntry.run(pm4Id, p3Id, thisMon, 2, 'Meetings', 'Tools team standup', 'draft', null, null, null, null);

  // ── ROSA ── (Data Analytics + HC Mobile App)
  for (let w = 1; w <= 8; w++) {
    const wStart = weekStart(daysAgo(w * 7));
    const status = w > 2 ? (w > 5 ? 'approved' : 'pending') : 'draft';
    const submittedAt = status !== 'draft' ? addDays(wStart, 5) : null;
    for (let d = 0; d < 4; d++) {
      const date = addDays(wStart, d);
      insertEntry.run(pm5Id, p4Id, date, 4, 'Reporting', 'BI dashboard work', status, status === 'approved' ? adminId : null, status === 'approved' ? now : null, null, submittedAt);
      insertEntry.run(pm5Id, p1Id, date, 3, categories[d % 6], 'Mobile app QA and review', status, status === 'approved' ? adminId : null, status === 'approved' ? now : null, null, submittedAt);
    }
  }

  // ── MARIA (deactivated) ── historical entries on now-archived project
  for (let w = 1; w <= 4; w++) {
    const wStart = weekStart(monthsAgo((w + 8) * 7 / 7));
    for (let d = 0; d < 5; d++) {
      const date = addDays(wStart, d);
      insertEntry.run(pm1Id, p6Id, date, 4, 'Planning', 'Office automation setup', 'approved', adminId, now, null, addDays(wStart, 5));
    }
  }

  console.log('Seeding feature suggestions...');
  const insertSuggestion = db.prepare(`
    INSERT INTO feature_suggestions (user_id, title, description, category, status, admin_comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertSuggestion.run(pm2Id, 'Dark mode support', 'The app is hard to use in low-light environments. A dark theme would help PMs working late.', 'UX', 'under_review', 'Great idea — added to the UI backlog for Q3.');
  insertSuggestion.run(pm3Id, 'Export timesheet as PDF', 'It would be useful to export my weekly timesheet as a formatted PDF to share with my team lead.', 'Reporting', 'planned', 'Planned for next reporting milestone.');
  insertSuggestion.run(pm4Id, 'Mobile-friendly timesheet grid', 'The weekly grid is hard to use on a phone. A simpler mobile layout would help.', 'UX', 'new', null);
  insertSuggestion.run(pm5Id, 'Slack notification when timesheet approved', 'Would save me checking the app manually every day.', 'Workflow', 'new', null);
  insertSuggestion.run(pm2Id, 'Copy entries from any previous week, not just last week', 'Sometimes I need to copy a template from a specific past week.', 'Workflow', 'done', 'Released in v1.1 — see the week picker in Copy Last Week.');

  console.log('Seeding audit log (sample entries)...');
  const insertAudit = db.prepare(`
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, detail, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(adminId, 'CREATE', 'user', pm1Id, JSON.stringify({ name: 'Maria Santos', role: 'pm' }), monthsAgo(6));
  insertAudit.run(adminId, 'CREATE', 'user', pm2Id, JSON.stringify({ name: 'Juan dela Cruz', role: 'pm' }), monthsAgo(5));
  insertAudit.run(adminId, 'CREATE', 'user', pm3Id, JSON.stringify({ name: 'Ana Reyes', role: 'pm' }), monthsAgo(4));
  insertAudit.run(adminId, 'CREATE', 'user', pm4Id, JSON.stringify({ name: 'Carlos Mendoza', role: 'pm' }), monthsAgo(4));
  insertAudit.run(adminId, 'CREATE', 'user', pm5Id, JSON.stringify({ name: 'Rosa Lim', role: 'pm' }), monthsAgo(3));
  insertAudit.run(adminId, 'DEACTIVATE', 'user', pm1Id, JSON.stringify({ reason: 'Left the company', ended_assignments: [p6Id, p1Id] }), monthsAgo(2));
  insertAudit.run(adminId, 'CREATE', 'project', p1Id, JSON.stringify({ name: 'HC Mobile App', billable: true }), monthsAgo(6));
  insertAudit.run(adminId, 'ARCHIVE', 'project', p6Id, JSON.stringify({ name: 'Office Automation' }), monthsAgo(2));
  insertAudit.run(adminId, 'REJECT', 'time_entry', null, JSON.stringify({ pm: 'Ana Reyes', reason: 'Hours exceed project scope for this period.' }), monthsAgo(5));
  insertAudit.run(pm2Id, 'LOGIN_SUCCESS', 'user', pm2Id, JSON.stringify({ email: 'juan.delacruz@hc.ph' }), daysAgo(1));

  const entryCount = db.prepare('SELECT COUNT(*) as c FROM time_entries').get().c;
  console.log(`\n✅ Seed complete.`);
  console.log(`   Users: ${db.prepare('SELECT COUNT(*) as c FROM users').get().c} (1 admin, 5 PMs)`);
  console.log(`   Projects: ${db.prepare('SELECT COUNT(*) as c FROM projects').get().c}`);
  console.log(`   Assignments: ${db.prepare('SELECT COUNT(*) as c FROM project_assignments').get().c}`);
  console.log(`   Time entries: ${entryCount}`);
  console.log(`   Suggestions: ${db.prepare('SELECT COUNT(*) as c FROM feature_suggestions').get().c}`);
  console.log(`\n   Admin login: jakub.pechoucek@homecredit.ph / Admin1234`);
  console.log(`   PM login:    juan.delacruz@hc.ph / Temp1234!  (first login → will prompt password change)`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
