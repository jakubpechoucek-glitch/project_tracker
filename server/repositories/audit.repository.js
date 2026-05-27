const { getDb } = require('../../db/db');

function findAll({ search, page = 1, pageSize = 20 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(a.action LIKE ? OR a.entity_type LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM audit_log a
    LEFT JOIN users u ON u.id = a.user_id
    ${where}
  `).get(...params)?.count ?? 0;

  const rows = db.prepare(`
    SELECT a.*, u.name as user_name, u.email as user_email
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.user_id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  return { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

module.exports = { findAll };
