require('./setup');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server/index');
const { getDb, closeDb } = require('../db/db');
const { runMigrations } = require('../db/migrate');

let adminToken;

beforeAll(async () => {
  runMigrations();
  const db = getDb();
  db.exec("DELETE FROM audit_log; DELETE FROM time_entries; DELETE FROM project_assignments; DELETE FROM feature_suggestions; DELETE FROM projects; DELETE FROM users;");
  const hash = bcrypt.hashSync('Admin1234', 1);
  const adminResult = db.prepare("INSERT INTO users (name, email, password_hash, role, is_active, is_first_login) VALUES (?, ?, ?, ?, 1, 0)").run('Admin', 'admin5@test.com', hash, 'admin');
  const pmResult = db.prepare("INSERT INTO users (name, email, password_hash, role, is_active, is_first_login) VALUES (?, ?, ?, ?, 1, 0)").run('PM', 'pm5@test.com', hash, 'pm');
  const pResult = db.prepare("INSERT INTO projects (name, budget_hours, billable, status) VALUES (?, ?, ?, ?)").run('Report Project', 100, 1, 'active');
  db.prepare("INSERT INTO project_assignments (pm_id, project_id, assigned_from) VALUES (?, ?, ?)").run(pmResult.lastInsertRowid, pResult.lastInsertRowid, '2026-01-01');

  // Seed some entries
  db.prepare("INSERT INTO time_entries (pm_id, project_id, date, hours, category, status, approved_by, approved_at, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(pmResult.lastInsertRowid, pResult.lastInsertRowid, '2026-05-01', 8, 'Planning', 'approved', adminResult.lastInsertRowid, new Date().toISOString(), new Date().toISOString());
  db.prepare("INSERT INTO time_entries (pm_id, project_id, date, hours, category, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(pmResult.lastInsertRowid, pResult.lastInsertRowid, '2026-05-02', 6, 'Meetings', 'pending', new Date().toISOString());
  db.prepare("INSERT INTO time_entries (pm_id, project_id, date, hours, category, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(pmResult.lastInsertRowid, pResult.lastInsertRowid, '2026-05-03', 4, 'Reporting', 'rejected', new Date().toISOString());

  const loginRes = await request(app).post('/api/auth/login').send({ email: 'admin5@test.com', password: 'Admin1234' });
  adminToken = loginRes.body.data.token;
});

afterAll(() => closeDb());

describe('Reports calculations', () => {
  test('monthly summary returns correct hours', async () => {
    const res = await request(app).get('/api/reports/monthly?month=2026-05').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const rows = res.body.data;
    const total = rows.reduce((s, r) => s + r.total_hours, 0);
    // approved (8) + pending (6) = 14h
    expect(total).toBe(14);
  });

  test('budget report shows correct consumption', async () => {
    const res = await request(app).get('/api/reports/budget').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const project = res.body.data.find(p => p.project_name === 'Report Project');
    expect(project).toBeTruthy();
    // 8 approved + 6 pending = 14h logged
    expect(project.hours_logged).toBe(14);
    expect(project.pct_consumed).toBe(14); // 14/100 * 100 = 14%
  });

  test('approval report calculates approval rate correctly', async () => {
    const res = await request(app).get('/api/reports/approval').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const pm = res.body.data[0];
    // submitted = pending(6) + approved(8) + rejected(4) = 18h
    expect(pm.submitted_hours).toBe(18);
    expect(pm.approved_hours).toBe(8);
    expect(pm.rejected_hours).toBe(4);
    // approval_rate = 8/18 * 100 = 44.4
    expect(pm.approval_rate).toBeCloseTo(44.4, 0);
  });

  test('reports require admin role', async () => {
    const res = await request(app).get('/api/reports/monthly');
    expect(res.status).toBe(401);
  });
});
