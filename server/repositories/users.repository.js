const { getDb } = require('../../db/db');

function findAll({ includeInactive = false } = {}) {
  const db = getDb();
  const sql = includeInactive
    ? 'SELECT id, name, email, role, is_active, is_first_login, created_at, updated_at FROM users ORDER BY name'
    : 'SELECT id, name, email, role, is_active, is_first_login, created_at, updated_at FROM users WHERE is_active = 1 ORDER BY name';
  return db.prepare(sql).all();
}

function findById(id) {
  return getDb().prepare(
    'SELECT id, name, email, role, is_active, is_first_login, failed_login_count, locked_until, created_at, updated_at FROM users WHERE id = ?'
  ).get(id);
}

function findByEmail(email) {
  return getDb().prepare(
    'SELECT * FROM users WHERE email = ?'
  ).get(email);
}

function create({ name, email, passwordHash, role = 'pm', isFirstLogin = 1 }) {
  const db = getDb();
  return db.prepare(
    'INSERT INTO users (name, email, password_hash, role, is_first_login) VALUES (?, ?, ?, ?, ?)'
  ).run(name, email, passwordHash, role, isFirstLogin ? 1 : 0);
}

function update(id, { name, email }) {
  return getDb().prepare(
    'UPDATE users SET name = ?, email = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(name, email, id);
}

function updatePassword(id, passwordHash) {
  return getDb().prepare(
    'UPDATE users SET password_hash = ?, is_first_login = 0, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(passwordHash, id);
}

function deactivate(id) {
  return getDb().prepare(
    'UPDATE users SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(id);
}

function reactivate(id) {
  return getDb().prepare(
    'UPDATE users SET is_active = 1, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(id);
}

function incrementFailedLogin(id) {
  return getDb().prepare(
    'UPDATE users SET failed_login_count = failed_login_count + 1, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(id);
}

function lockAccount(id, until) {
  return getDb().prepare(
    'UPDATE users SET locked_until = ?, failed_login_count = 0, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(until, id);
}

function resetLoginAttempts(id) {
  return getDb().prepare(
    'UPDATE users SET failed_login_count = 0, locked_until = NULL, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(id);
}

function getUserStats(id) {
  const db = getDb();
  const totalHours = db.prepare(
    'SELECT COALESCE(SUM(hours), 0) as total FROM time_entries WHERE pm_id = ?'
  ).get(id)?.total ?? 0;

  const approvedHours = db.prepare(
    'SELECT COALESCE(SUM(hours), 0) as total FROM time_entries WHERE pm_id = ? AND status = \'approved\''
  ).get(id)?.total ?? 0;

  const submittedHours = db.prepare(
    'SELECT COALESCE(SUM(hours), 0) as total FROM time_entries WHERE pm_id = ? AND status IN (\'pending\',\'approved\',\'rejected\')'
  ).get(id)?.total ?? 0;

  return { totalHours, approvedHours, submittedHours };
}

module.exports = {
  findAll, findById, findByEmail, create, update, updatePassword,
  deactivate, reactivate, incrementFailedLogin, lockAccount, resetLoginAttempts, getUserStats
};
