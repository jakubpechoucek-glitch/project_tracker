require('./setup');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server/index');
const { getDb, closeDb } = require('../db/db');
const { runMigrations } = require('../db/migrate');

beforeAll(() => {
  runMigrations();
  const db = getDb();
  db.exec("DELETE FROM audit_log; DELETE FROM time_entries; DELETE FROM project_assignments; DELETE FROM feature_suggestions; DELETE FROM projects; DELETE FROM users;");
  const hash = bcrypt.hashSync('Admin1234', 1);
  db.prepare("INSERT INTO users (name, email, password_hash, role, is_active, is_first_login) VALUES (?, ?, ?, ?, 1, 0)")
    .run('Test Admin', 'admin@test.com', hash, 'admin');
  db.prepare("INSERT INTO users (name, email, password_hash, role, is_active, is_first_login) VALUES (?, ?, ?, ?, 1, 1)")
    .run('Test PM', 'pm@test.com', hash, 'pm');
  db.prepare("INSERT INTO users (name, email, password_hash, role, is_active, is_first_login) VALUES (?, ?, ?, ?, 0, 0)")
    .run('Inactive PM', 'inactive@test.com', hash, 'pm');
});

afterAll(() => closeDb());

describe('POST /api/auth/login', () => {
  test('returns token on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Admin1234' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('admin');
  });

  test('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('rejects unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'Admin1234' });
    expect(res.status).toBe(401);
  });

  test('rejects inactive account', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'inactive@test.com', password: 'Admin1234' });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/auth/me', () => {
  test('returns user data with valid token', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Admin1234' });
    const token = loginRes.body.data.token;
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@test.com');
  });

  test('rejects missing token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('rejects invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/change-password', () => {
  let pmToken;
  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'pm@test.com', password: 'Admin1234' });
    pmToken = res.body.data.token;
  });

  test('rejects weak new password', async () => {
    const res = await request(app).post('/api/auth/change-password')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ currentPassword: 'Admin1234', newPassword: 'weak' });
    expect(res.status).toBe(422);
  });

  test('changes password with valid input', async () => {
    const res = await request(app).post('/api/auth/change-password')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ currentPassword: 'Admin1234', newPassword: 'NewPass123' });
    expect(res.status).toBe(200);
  });
});
