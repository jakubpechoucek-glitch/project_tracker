const { getDb } = require('../../db/db');

function findAll({ includeArchived = false } = {}) {
  const db = getDb();
  const sql = includeArchived
    ? 'SELECT * FROM projects ORDER BY name'
    : 'SELECT * FROM projects WHERE status = \'active\' ORDER BY name';
  return db.prepare(sql).all();
}

function findById(id) {
  return getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

function create({ name, description, budgetHours, billable, status = 'active' }) {
  return getDb().prepare(
    'INSERT INTO projects (name, description, budget_hours, billable, status) VALUES (?, ?, ?, ?, ?)'
  ).run(name, description || null, budgetHours, billable ? 1 : 0, status);
}

function update(id, { name, description, budgetHours, billable, status }) {
  return getDb().prepare(
    'UPDATE projects SET name = ?, description = ?, budget_hours = ?, billable = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(name, description || null, budgetHours, billable ? 1 : 0, status, id);
}

function archive(id) {
  return getDb().prepare(
    'UPDATE projects SET status = \'archived\', updated_at = datetime(\'now\') WHERE id = ?'
  ).run(id);
}

function getHoursLogged(id) {
  return getDb().prepare(
    'SELECT COALESCE(SUM(hours), 0) as total FROM time_entries WHERE project_id = ? AND status IN (\'pending\',\'approved\')'
  ).get(id)?.total ?? 0;
}

function getHoursLast30Days(id) {
  return getDb().prepare(
    `SELECT COALESCE(SUM(hours), 0) as total FROM time_entries
     WHERE project_id = ? AND status IN ('pending','approved')
     AND date >= date('now', '-30 days')`
  ).get(id)?.total ?? 0;
}

module.exports = { findAll, findById, create, update, archive, getHoursLogged, getHoursLast30Days };
