require('./setup');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server/index');
const { getDb, closeDb } = require('../db/db');
const { runMigrations } = require('../db/migrate');

let adminToken, pmToken, pmId, projectId, adminId;

beforeAll(async () => {
  runMigrations();
  const db = getDb();
  db.exec("DELETE FROM audit_log; DELETE FROM time_entries; DELETE FROM project_assignments; DELETE FROM feature_suggestions; DELETE FROM projects; DELETE FROM users;");
  const hash = bcrypt.hashSync('Admin1234', 1);
  const adminResult = db.prepare("INSERT INTO users (name, email, password_hash, role, is_active, is_first_login) VALUES (?, ?, ?, ?, 1, 0)").run('Admin', 'admin4@test.com', hash, 'admin');
  adminId = adminResult.lastInsertRowid;
  const pmResult = db.prepare("INSERT INTO users (name, email, password_hash, role, is_active, is_first_login) VALUES (?, ?, ?, ?, 1, 0)").run('PM', 'pm4@test.com', hash, 'pm');
  pmId = pmResult.lastInsertRowid;
  const pResult = db.prepare("INSERT INTO projects (name, budget_hours, billable, status) VALUES (?, ?, ?, ?)").run('Approval Test Project', 100, 1, 'active');
  projectId = pResult.lastInsertRowid;
  db.prepare("INSERT INTO project_assignments (pm_id, project_id, assigned_from) VALUES (?, ?, ?)").run(pmId, projectId, '2026-01-01');

  const [a, p] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'admin4@test.com', password: 'Admin1234' }),
    request(app).post('/api/auth/login').send({ email: 'pm4@test.com', password: 'Admin1234' }),
  ]);
  adminToken = a.body.data.token;
  pmToken = p.body.data.token;
});

afterAll(() => closeDb());

describe('Approval workflow', () => {
  let entryId;

  test('PM can create draft entry', async () => {
    const res = await request(app).post('/api/entries')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ projectId, date: '2026-03-10', hours: 4, category: 'Planning', description: 'Test' });
    expect(res.status).toBe(201);
    entryId = res.body.data.entry.id;
    expect(res.body.data.entry.status).toBe('draft');
  });

  test('PM can submit week', async () => {
    const res = await request(app).post('/api/entries/submit')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ week: '2026-03-09' });
    expect(res.status).toBe(200);
    expect(res.body.data.submitted).toBe(1);
  });

  test('Entry is now approved (auto-approved on submit)', async () => {
    const res = await request(app).get(`/api/entries?pmId=${pmId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const entry = res.body.data.rows.find(e => e.id === entryId);
    expect(entry.status).toBe('approved');
  });

  test('PM cannot approve own entry', async () => {
    const res = await request(app).post(`/api/entries/${entryId}/approve`)
      .set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(403);
  });

  test('Admin can reject a pending entry', async () => {
    // Force back to pending so reject endpoint accepts it
    const db = getDb();
    db.prepare("UPDATE time_entries SET status = 'pending' WHERE id = ?").run(entryId);
    const res = await request(app).post(`/api/entries/${entryId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Insufficient description, please add more detail' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
    expect(res.body.data.rejection_reason).toContain('Insufficient');
  });

  test('Entry is rejected', async () => {
    const res = await request(app).get(`/api/entries?pmId=${pmId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const entry = res.body.data.rows.find(e => e.id === entryId);
    expect(entry.status).toBe('rejected');
  });

  test('Admin can approve entry', async () => {
    // First put back to pending
    const db = getDb();
    db.prepare("UPDATE time_entries SET status = 'pending' WHERE id = ?").run(entryId);
    const res = await request(app).post(`/api/entries/${entryId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });

  test('PM cannot edit approved entry', async () => {
    const res = await request(app).put(`/api/entries/${entryId}`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ hours: 6, category: 'Meetings' });
    expect(res.status).toBe(403);
  });

  test('Admin can reopen approved entry', async () => {
    const res = await request(app).post(`/api/entries/${entryId}/reopen`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('draft');
  });

  test('reject reason is required', async () => {
    const db = getDb();
    db.prepare("UPDATE time_entries SET status = 'pending' WHERE id = ?").run(entryId);
    const res = await request(app).post(`/api/entries/${entryId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'ok' });
    expect(res.status).toBe(422);
  });
});
