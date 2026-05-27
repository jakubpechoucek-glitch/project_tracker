require('./setup');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server/index');
const { getDb, closeDb } = require('../db/db');
const { runMigrations } = require('../db/migrate');

let adminToken, pmId, projectId;

beforeAll(async () => {
  runMigrations();
  const db = getDb();
  db.exec("DELETE FROM audit_log; DELETE FROM time_entries; DELETE FROM project_assignments; DELETE FROM feature_suggestions; DELETE FROM projects; DELETE FROM users;");
  const hash = bcrypt.hashSync('Admin1234', 1);
  db.prepare("INSERT INTO users (name, email, password_hash, role, is_active, is_first_login) VALUES (?, ?, ?, ?, 1, 0)").run('Admin', 'admin3@test.com', hash, 'admin');
  const pmResult = db.prepare("INSERT INTO users (name, email, password_hash, role, is_active, is_first_login) VALUES (?, ?, ?, ?, 1, 0)").run('PM', 'pm3@test.com', hash, 'pm');
  pmId = pmResult.lastInsertRowid;
  const pResult = db.prepare("INSERT INTO projects (name, budget_hours, billable, status) VALUES (?, ?, ?, ?)").run('Test Project', 100, 1, 'active');
  projectId = pResult.lastInsertRowid;

  const loginRes = await request(app).post('/api/auth/login').send({ email: 'admin3@test.com', password: 'Admin1234' });
  adminToken = loginRes.body.data.token;
});

afterAll(() => closeDb());

describe('Assignment validation', () => {
  let assignmentId;

  test('can create assignment', async () => {
    const res = await request(app).post('/api/assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pmId, projectId, assignedFrom: '2026-01-01' });
    expect(res.status).toBe(201);
    assignmentId = res.body.data.id;
  });

  test('rejects duplicate active assignment', async () => {
    const res = await request(app).post('/api/assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pmId, projectId, assignedFrom: '2026-02-01' });
    expect(res.status).toBe(409);
  });

  test('cannot log time outside assignment period', async () => {
    const pmLogin = await request(app).post('/api/auth/login').send({ email: 'pm3@test.com', password: 'Admin1234' });
    const pmToken = pmLogin.body.data.token;
    const res = await request(app).post('/api/entries')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ projectId, date: '2025-12-31', hours: 4, category: 'Planning' });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/not assigned/i);
  });

  test('cannot log time on archived project', async () => {
    const db = getDb();
    const archivedResult = db.prepare("INSERT INTO projects (name, budget_hours, billable, status) VALUES (?, ?, ?, ?)").run('Archived Project', 100, 1, 'archived');
    const archivedId = archivedResult.lastInsertRowid;
    const pmLogin = await request(app).post('/api/auth/login').send({ email: 'pm3@test.com', password: 'Admin1234' });
    const pmToken = pmLogin.body.data.token;
    const res = await request(app).post('/api/entries')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ projectId: archivedId, date: '2026-01-15', hours: 4, category: 'Planning' });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/archived/i);
  });

  test('can end assignment', async () => {
    const res = await request(app).post(`/api/assignments/${assignmentId}/end`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: '2026-03-31' });
    expect(res.status).toBe(200);
  });

  test('can create new assignment after ending previous', async () => {
    const res = await request(app).post('/api/assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pmId, projectId, assignedFrom: '2026-04-01' });
    expect(res.status).toBe(201);
  });
});
