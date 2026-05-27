const { getDb } = require('../../db/db');

function findAll() {
  return getDb().prepare(`
    SELECT a.*, u.name as pm_name, u.email as pm_email, p.name as project_name
    FROM project_assignments a
    JOIN users u ON u.id = a.pm_id
    JOIN projects p ON p.id = a.project_id
    ORDER BY a.assigned_from DESC
  `).all();
}

function findActive() {
  return getDb().prepare(`
    SELECT a.*, u.name as pm_name, p.name as project_name
    FROM project_assignments a
    JOIN users u ON u.id = a.pm_id
    JOIN projects p ON p.id = a.project_id
    WHERE a.assigned_to IS NULL
    ORDER BY u.name, p.name
  `).all();
}

function findByPm(pmId) {
  return getDb().prepare(`
    SELECT a.*, p.name as project_name, p.billable, p.status as project_status
    FROM project_assignments a
    JOIN projects p ON p.id = a.project_id
    WHERE a.pm_id = ?
    ORDER BY a.assigned_from DESC
  `).all(pmId);
}

function findActivePmProjects(pmId) {
  return getDb().prepare(`
    SELECT a.*, p.name as project_name, p.billable, p.budget_hours, p.status as project_status, p.description
    FROM project_assignments a
    JOIN projects p ON p.id = a.project_id
    WHERE a.pm_id = ?
      AND p.status = 'active'
      AND (a.assigned_to IS NULL OR a.assigned_to >= date('now'))
    ORDER BY p.name
  `).all(pmId);
}

function findByProject(projectId) {
  return getDb().prepare(`
    SELECT a.*, u.name as pm_name, u.email as pm_email
    FROM project_assignments a
    JOIN users u ON u.id = a.pm_id
    WHERE a.project_id = ?
    ORDER BY a.assigned_from DESC
  `).all(projectId);
}

function findById(id) {
  return getDb().prepare('SELECT * FROM project_assignments WHERE id = ?').get(id);
}

function findOverlap(pmId, projectId, excludeId = null) {
  const sql = excludeId
    ? 'SELECT id FROM project_assignments WHERE pm_id = ? AND project_id = ? AND assigned_to IS NULL AND id != ?'
    : 'SELECT id FROM project_assignments WHERE pm_id = ? AND project_id = ? AND assigned_to IS NULL';
  return excludeId
    ? getDb().prepare(sql).get(pmId, projectId, excludeId)
    : getDb().prepare(sql).get(pmId, projectId);
}

function create({ pmId, projectId, assignedFrom }) {
  return getDb().prepare(
    'INSERT INTO project_assignments (pm_id, project_id, assigned_from) VALUES (?, ?, ?)'
  ).run(pmId, projectId, assignedFrom);
}

function endAssignment(id, assignedTo) {
  return getDb().prepare(
    'UPDATE project_assignments SET assigned_to = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(assignedTo, id);
}

function endAllActiveForPm(pmId, assignedTo) {
  return getDb().prepare(
    'UPDATE project_assignments SET assigned_to = ?, updated_at = datetime(\'now\') WHERE pm_id = ? AND assigned_to IS NULL'
  ).run(assignedTo, pmId);
}

function isAssignedOnDate(pmId, projectId, date) {
  return getDb().prepare(`
    SELECT id FROM project_assignments
    WHERE pm_id = ? AND project_id = ?
      AND assigned_from <= ?
      AND (assigned_to IS NULL OR assigned_to >= ?)
  `).get(pmId, projectId, date, date);
}

module.exports = {
  findAll, findActive, findByPm, findActivePmProjects, findByProject,
  findById, findOverlap, create, endAssignment, endAllActiveForPm, isAssignedOnDate
};
