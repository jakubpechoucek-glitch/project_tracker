require('./setup');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server/index');
const { getDb, closeDb } = require('../db/db');
const { runMigrations } = require('../db/migrate');

let adminToken, pmToken;

beforeAll(async () => {
  runMigrations();
  const db = getDb();
  db.exec("DELETE FROM audit_log; DELETE FROM time_entries; DELETE FROM project_assignments; DELETE FROM feature_suggestions; DELETE FROM projects; DELETE FROM users;");
  const hash = bcrypt.hashSync('Admin1234', 1);
  db.prepare("INSERT INTO users (name, email, password_hash, role, is_active, is_first_login) VALUES (?, ?, ?, ?, 1, 0)").run('Admin', 'admin2@test.com', hash, 'admin');
  db.prepare("INSERT INTO users (name, email, password_hash, role, is_active, is_first_login) VALUES (?, ?, ?, ?, 1, 0)").run('PM', 'pm2@test.com', hash, 'pm');

  const [a, p] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'admin2@test.com', password: 'Admin1234' }),
    request(app).post('/api/auth/login').send({ email: 'pm2@test.com', password: 'Admin1234' }),
  ]);
  adminToken = a.body.data.token;
  pmToken = p.body.data.token;
});

afterAll(() => closeDb());

describe('Role enforcement', () => {
  test('PM cannot access /api/users (admin only)', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(403);
  });

  test('Admin can access /api/users', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('PM cannot access /api/reports/budget', async () => {
    const res = await request(app).get('/api/reports/budget').set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(403);
  });

  test('PM cannot access /api/audit', async () => {
    const res = await request(app).get('/api/audit').set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(403);
  });

  test('Unauthenticated request is rejected', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  test('PM can access /api/assignments/my-projects', async () => {
    const res = await request(app).get('/api/assignments/my-projects').set('Authorization', `Bearer ${pmToken}`);
    expect(res.status).toBe(200);
  });
});
