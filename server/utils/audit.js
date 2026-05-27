const { getDb } = require('../../db/db');

function log(userId, action, entityType, entityId = null, detail = {}) {
  try {
    const db = getDb();
    db.prepare(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, detail) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, action, entityType, entityId, JSON.stringify(detail));
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { log };
