const { getDb } = require('../../db/db');

function findAll({ pmId, projectId, dateFrom, dateTo, category, status, page = 1, pageSize = 20 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (pmId)      { conditions.push('e.pm_id = ?');      params.push(pmId); }
  if (projectId) { conditions.push('e.project_id = ?'); params.push(projectId); }
  if (dateFrom)  { conditions.push('e.date >= ?');      params.push(dateFrom); }
  if (dateTo)    { conditions.push('e.date <= ?');      params.push(dateTo); }
  if (category)  { conditions.push('e.category = ?');   params.push(category); }
  if (status)    { conditions.push('e.status = ?');     params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM time_entries e ${where}
  `).get(...params)?.count ?? 0;

  const rows = db.prepare(`
    SELECT e.*, u.name as pm_name, p.name as project_name,
           ab.name as approved_by_name
    FROM time_entries e
    JOIN users u ON u.id = e.pm_id
    JOIN projects p ON p.id = e.project_id
    LEFT JOIN users ab ON ab.id = e.approved_by
    ${where}
    ORDER BY e.date DESC, e.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);

  return { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

function findByPmAndWeek(pmId, weekStart, weekEnd) {
  return getDb().prepare(`
    SELECT e.*, p.name as project_name, p.billable
    FROM time_entries e
    JOIN projects p ON p.id = e.project_id
    WHERE e.pm_id = ? AND e.date >= ? AND e.date <= ?
    ORDER BY e.date, p.name
  `).all(pmId, weekStart, weekEnd);
}

function findById(id) {
  return getDb().prepare(`
    SELECT e.*, u.name as pm_name, p.name as project_name
    FROM time_entries e
    JOIN users u ON u.id = e.pm_id
    JOIN projects p ON p.id = e.project_id
    WHERE e.id = ?
  `).get(id);
}

function findDuplicate(pmId, projectId, date, excludeId = null) {
  const sql = excludeId
    ? 'SELECT id FROM time_entries WHERE pm_id = ? AND project_id = ? AND date = ? AND id != ?'
    : 'SELECT id FROM time_entries WHERE pm_id = ? AND project_id = ? AND date = ?';
  return excludeId
    ? getDb().prepare(sql).get(pmId, projectId, date, excludeId)
    : getDb().prepare(sql).get(pmId, projectId, date);
}

function getDailyTotal(pmId, date, excludeId = null) {
  const sql = excludeId
    ? 'SELECT COALESCE(SUM(hours), 0) as total FROM time_entries WHERE pm_id = ? AND date = ? AND id != ?'
    : 'SELECT COALESCE(SUM(hours), 0) as total FROM time_entries WHERE pm_id = ? AND date = ?';
  return excludeId
    ? getDb().prepare(sql).get(pmId, date, excludeId)?.total ?? 0
    : getDb().prepare(sql).get(pmId, date)?.total ?? 0;
}

function create({ pmId, projectId, date, hours, category, description }) {
  return getDb().prepare(
    'INSERT INTO time_entries (pm_id, project_id, date, hours, category, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(pmId, projectId, date, hours, category, description || null);
}

function update(id, { hours, category, description, date }) {
  return getDb().prepare(
    'UPDATE time_entries SET hours = ?, category = ?, description = ?, date = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(hours, category, description || null, date, id);
}

function updateStatus(id, { status, approvedBy, approvedAt, rejectionReason, submittedAt }) {
  return getDb().prepare(`
    UPDATE time_entries
    SET status = ?,
        approved_by = ?,
        approved_at = ?,
        rejection_reason = ?,
        submitted_at = COALESCE(?, submitted_at),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(status, approvedBy ?? null, approvedAt ?? null, rejectionReason ?? null, submittedAt ?? null, id);
}

function submitWeek(pmId, weekStart, weekEnd) {
  const now = new Date().toISOString();
  return getDb().prepare(`
    UPDATE time_entries
    SET status = 'approved', submitted_at = ?, approved_at = ?, updated_at = datetime('now')
    WHERE pm_id = ? AND date >= ? AND date <= ? AND status = 'draft'
  `).run(now, now, pmId, weekStart, weekEnd);
}

function remove(id) {
  return getDb().prepare('DELETE FROM time_entries WHERE id = ?').run(id);
}

function findPendingGroupedByPmWeek() {
  return getDb().prepare(`
    SELECT
      e.pm_id,
      u.name as pm_name,
      MIN(e.date) as week_start_approx,
      SUBSTR(e.date, 1, 7) as month,
      COUNT(*) as entry_count,
      SUM(e.hours) as total_hours
    FROM time_entries e
    JOIN users u ON u.id = e.pm_id
    WHERE e.status = 'pending'
    GROUP BY e.pm_id
    ORDER BY u.name
  `).all();
}

function findPendingForPmWeek(pmId, weekStart, weekEnd) {
  return getDb().prepare(`
    SELECT e.*, p.name as project_name
    FROM time_entries e
    JOIN projects p ON p.id = e.project_id
    WHERE e.pm_id = ? AND e.date >= ? AND e.date <= ? AND e.status = 'pending'
    ORDER BY e.date, p.name
  `).all(pmId, weekStart, weekEnd);
}

function getWeeklySummary(pmId) {
  const db = getDb();
  const thisWeek = db.prepare(`
    SELECT COALESCE(SUM(hours), 0) as total FROM time_entries
    WHERE pm_id = ? AND date >= date('now', 'weekday 1', '-7 days') AND date <= date('now', 'weekday 0')
  `).get(pmId)?.total ?? 0;

  const thisMonth = db.prepare(`
    SELECT COALESCE(SUM(hours), 0) as total FROM time_entries
    WHERE pm_id = ? AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
  `).get(pmId)?.total ?? 0;

  return { thisWeek, thisMonth };
}

function getAdminWeeklySummary() {
  const db = getDb();
  const thisWeek = db.prepare(`
    SELECT COALESCE(SUM(hours), 0) as total FROM time_entries
    WHERE date >= date('now', 'weekday 1', '-7 days') AND date <= date('now', 'weekday 0')
    AND status IN ('pending','approved')
  `).get()?.total ?? 0;

  const thisMonth = db.prepare(`
    SELECT COALESCE(SUM(hours), 0) as total FROM time_entries
    WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
    AND status IN ('pending','approved')
  `).get()?.total ?? 0;

  const pendingCount = db.prepare(
    'SELECT COUNT(*) as c FROM time_entries WHERE status = \'pending\''
  ).get()?.c ?? 0;

  return { thisWeek, thisMonth, pendingCount };
}

function getHoursPerProject(month) {
  return getDb().prepare(`
    SELECT p.id as project_id, p.name as project_name, COALESCE(SUM(e.hours), 0) as total_hours
    FROM projects p
    LEFT JOIN time_entries e ON e.project_id = p.id
      AND strftime('%Y-%m', e.date) = ?
      AND e.status IN ('pending','approved')
    WHERE p.status = 'active'
    GROUP BY p.id, p.name
    ORDER BY total_hours DESC
  `).all(month);
}

/** Hours grouped by category for a PM over a date range */
function getActivityBreakdownPm(pmId, dateFrom, dateTo) {
  return getDb().prepare(`
    SELECT
      COALESCE(e.category, 'Other') as activity,
      ROUND(SUM(e.hours), 1)        as total_hours,
      COUNT(*)                      as entry_count
    FROM time_entries e
    WHERE e.pm_id = ?
      AND e.date >= ? AND e.date <= ?
      AND e.status IN ('draft','pending','approved')
    GROUP BY COALESCE(e.category, 'Other')
    ORDER BY total_hours DESC
  `).all(pmId, dateFrom, dateTo);
}

/** Hours grouped by category across all PMs for a month (admin) */
function getActivityBreakdownAdmin(dateFrom, dateTo) {
  return getDb().prepare(`
    SELECT
      COALESCE(e.category, 'Other') as activity,
      ROUND(SUM(e.hours), 1)        as total_hours,
      COUNT(*)                      as entry_count
    FROM time_entries e
    WHERE e.date >= ? AND e.date <= ?
      AND e.status IN ('draft','pending','approved')
    GROUP BY COALESCE(e.category, 'Other')
    ORDER BY total_hours DESC
  `).all(dateFrom, dateTo);
}

/** Hours grouped by project+activity for a PM over a date range */
function getActivityByProjectPm(pmId, dateFrom, dateTo) {
  const rows = getDb().prepare(`
    SELECT
      p.id as project_id, p.name as project_name,
      COALESCE(e.category, 'Other') as activity,
      ROUND(SUM(e.hours), 1) as total_hours,
      COUNT(*) as entry_count
    FROM time_entries e
    JOIN projects p ON p.id = e.project_id
    WHERE e.pm_id = ? AND e.date >= ? AND e.date <= ?
      AND e.status IN ('draft','pending','approved')
    GROUP BY p.id, COALESCE(e.category, 'Other')
    ORDER BY p.name, total_hours DESC
  `).all(pmId, dateFrom, dateTo);
  return groupByProject(rows);
}

/** Hours grouped by project+activity across all PMs for a date range (admin) */
function getActivityByProjectAdmin(dateFrom, dateTo) {
  const rows = getDb().prepare(`
    SELECT
      p.id as project_id, p.name as project_name,
      COALESCE(e.category, 'Other') as activity,
      ROUND(SUM(e.hours), 1) as total_hours,
      COUNT(*) as entry_count
    FROM time_entries e
    JOIN projects p ON p.id = e.project_id
    WHERE e.date >= ? AND e.date <= ?
      AND e.status IN ('draft','pending','approved')
    GROUP BY p.id, COALESCE(e.category, 'Other')
    ORDER BY p.name, total_hours DESC
  `).all(dateFrom, dateTo);
  return groupByProject(rows);
}

function groupByProject(rows) {
  const map = {};
  for (const r of rows) {
    if (!map[r.project_id]) {
      map[r.project_id] = { project_id: r.project_id, project_name: r.project_name, total_hours: 0, activities: [] };
    }
    map[r.project_id].total_hours = Math.round((map[r.project_id].total_hours + r.total_hours) * 10) / 10;
    map[r.project_id].activities.push({ activity: r.activity, total_hours: r.total_hours, entry_count: r.entry_count });
  }
  return Object.values(map).map(p => ({
    ...p,
    activities: p.activities.map(a => ({
      ...a,
      pct: p.total_hours > 0 ? Math.round((a.total_hours / p.total_hours) * 1000) / 10 : 0,
    })),
  })).sort((a, b) => b.total_hours - a.total_hours);
}

module.exports = {
  findAll, findByPmAndWeek, findById, findDuplicate, getDailyTotal,
  create, update, updateStatus, submitWeek, remove,
  findPendingGroupedByPmWeek, findPendingForPmWeek,
  getWeeklySummary, getAdminWeeklySummary, getHoursPerProject,
  getActivityBreakdownPm, getActivityBreakdownAdmin,
  getActivityByProjectPm, getActivityByProjectAdmin,
};
