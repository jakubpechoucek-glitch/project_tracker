const { getDb } = require('../../db/db');

function findAll({ userId, role } = {}) {
  const db = getDb();
  const sql = role === 'admin'
    ? `SELECT s.*, u.name as user_name, u.role as user_role FROM feature_suggestions s
       JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC`
    : `SELECT s.*, u.name as user_name FROM feature_suggestions s
       JOIN users u ON u.id = s.user_id WHERE s.user_id = ? ORDER BY s.created_at DESC`;
  return role === 'admin' ? db.prepare(sql).all() : db.prepare(sql).all(userId);
}

function findById(id) {
  return getDb().prepare(
    'SELECT s.*, u.name as user_name FROM feature_suggestions s JOIN users u ON u.id = s.user_id WHERE s.id = ?'
  ).get(id);
}

function create({ userId, title, description, category }) {
  return getDb().prepare(
    'INSERT INTO feature_suggestions (user_id, title, description, category) VALUES (?, ?, ?, ?)'
  ).run(userId, title, description, category);
}

function updateStatus(id, { status, adminComment, updatedBy }) {
  return getDb().prepare(
    'UPDATE feature_suggestions SET status = ?, admin_comment = ?, updated_by = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(status, adminComment ?? null, updatedBy, id);
}

module.exports = { findAll, findById, create, updateStatus };
