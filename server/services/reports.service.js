const { getDb } = require('../../db/db');
const { today } = require('../utils/date');

// ── Report 1: Monthly Summary ────────────────────────────────────────────────
// Hours per PM per project, grouped by month. Billable = project.billable = 1.
function monthlySummary({ month, pmId, projectId } = {}) {
  const db = getDb();
  const conditions = ["e.status IN ('pending','approved')"];
  const params = [];
  if (month)     { conditions.push("strftime('%Y-%m', e.date) = ?"); params.push(month); }
  if (pmId)      { conditions.push('e.pm_id = ?');                   params.push(pmId); }
  if (projectId) { conditions.push('e.project_id = ?');              params.push(projectId); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', e.date) as month,
      u.id as pm_id, u.name as pm_name,
      p.id as project_id, p.name as project_name, p.billable,
      SUM(e.hours) as total_hours,
      SUM(CASE WHEN p.billable = 1 THEN e.hours ELSE 0 END) as billable_hours,
      SUM(CASE WHEN p.billable = 0 THEN e.hours ELSE 0 END) as non_billable_hours
    FROM time_entries e
    JOIN users u ON u.id = e.pm_id
    JOIN projects p ON p.id = e.project_id
    ${where}
    GROUP BY strftime('%Y-%m', e.date), e.pm_id, e.project_id
    ORDER BY month DESC, u.name, p.name
  `).all(...params);

  // Month-over-month: attach previous month total per PM/project
  const prevMonth = month ? prevMonthOf(month) : null;
  let prevRows = [];
  if (prevMonth) {
    prevRows = db.prepare(`
      SELECT e.pm_id, e.project_id, SUM(e.hours) as prev_hours
      FROM time_entries e WHERE status IN ('pending','approved')
        AND strftime('%Y-%m', e.date) = ? GROUP BY e.pm_id, e.project_id
    `).all(prevMonth);
  }
  const prevMap = {};
  for (const r of prevRows) prevMap[`${r.pm_id}-${r.project_id}`] = r.prev_hours;

  return rows.map(r => ({
    ...r,
    billable: !!r.billable,
    prev_month_hours: prevMap[`${r.pm_id}-${r.project_id}`] ?? 0,
  }));
}

// ── Report 2: Budget Report ──────────────────────────────────────────────────
// Burn rate = trailing 30-day hours / 30 (hours per day).
// Forecast = today + remaining / burn_rate.
function budgetReport({ projectId } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM projects';
  const params = [];
  if (projectId) { sql += ' WHERE id = ?'; params.push(projectId); }

  const projects = db.prepare(sql).all(...params);
  const todayStr = today();

  return projects.map(p => {
    const hoursLogged = db.prepare(
      "SELECT COALESCE(SUM(hours),0) as t FROM time_entries WHERE project_id = ? AND status IN ('pending','approved')"
    ).get(p.id)?.t ?? 0;

    const hours30 = db.prepare(
      "SELECT COALESCE(SUM(hours),0) as t FROM time_entries WHERE project_id = ? AND status IN ('pending','approved') AND date >= date('now','-30 days')"
    ).get(p.id)?.t ?? 0;

    const burnRatePerDay = hours30 / 30;
    const remaining = Math.max(0, p.budget_hours - hoursLogged);
    const pct = p.budget_hours > 0 ? (hoursLogged / p.budget_hours) * 100 : 0;

    let forecastDate = null;
    if (burnRatePerDay > 0 && remaining > 0) {
      const daysLeft = Math.ceil(remaining / burnRatePerDay);
      const d = new Date(todayStr);
      d.setDate(d.getDate() + daysLeft);
      forecastDate = d.toISOString().slice(0, 10);
    }

    return {
      project_id: p.id,
      project_name: p.name,
      billable: !!p.billable,
      status: p.status,
      budget_hours: p.budget_hours,
      hours_logged: hoursLogged,
      pct_consumed: Math.round(pct * 10) / 10,
      hours_remaining: Math.round(remaining * 10) / 10,
      burn_rate_per_day: Math.round(burnRatePerDay * 100) / 100,
      forecast_date: forecastDate,
    };
  });
}

// ── Report 3: PM Workload ────────────────────────────────────────────────────
// avg_hours_day = total hours / working days in range (using calendar days for simplicity).
function workloadReport({ month, pmId } = {}) {
  const db = getDb();
  const conditions = ["e.status IN ('pending','approved')"];
  const params = [];
  if (month) { conditions.push("strftime('%Y-%m', e.date) = ?"); params.push(month); }
  if (pmId)  { conditions.push('e.pm_id = ?');                   params.push(pmId); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const rows = db.prepare(`
    SELECT
      u.id as pm_id, u.name as pm_name,
      strftime('%Y-%m', e.date) as month,
      COUNT(DISTINCT e.date) as days_worked,
      SUM(e.hours) as total_hours,
      SUM(CASE WHEN p.billable = 1 THEN e.hours ELSE 0 END) as billable_hours,
      SUM(CASE WHEN p.billable = 0 THEN e.hours ELSE 0 END) as non_billable_hours
    FROM time_entries e
    JOIN users u ON u.id = e.pm_id
    JOIN projects p ON p.id = e.project_id
    ${where}
    GROUP BY e.pm_id, strftime('%Y-%m', e.date)
    ORDER BY u.name, month DESC
  `).all(...params);

  // 6-month trend per PM
  const trend = db.prepare(`
    SELECT e.pm_id, strftime('%Y-%m', e.date) as month, SUM(e.hours) as total_hours
    FROM time_entries e
    WHERE e.status IN ('pending','approved')
      AND e.date >= date('now', '-6 months')
    GROUP BY e.pm_id, strftime('%Y-%m', e.date)
    ORDER BY e.pm_id, month
  `).all();

  const trendMap = {};
  for (const t of trend) {
    if (!trendMap[t.pm_id]) trendMap[t.pm_id] = [];
    trendMap[t.pm_id].push({ month: t.month, total_hours: t.total_hours });
  }

  return rows.map(r => ({
    ...r,
    avg_hours_day: r.days_worked > 0 ? Math.round((r.total_hours / r.days_worked) * 10) / 10 : 0,
    trend: trendMap[r.pm_id] ?? [],
  }));
}

// ── Report 4: Assignment Timeline ────────────────────────────────────────────
function assignmentTimeline({ pmId, projectId } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];
  if (pmId)      { conditions.push('a.pm_id = ?');      params.push(pmId); }
  if (projectId) { conditions.push('a.project_id = ?'); params.push(projectId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  return db.prepare(`
    SELECT
      a.id, a.pm_id, u.name as pm_name,
      a.project_id, p.name as project_name, p.billable,
      a.assigned_from, a.assigned_to,
      COALESCE(a.assigned_to, date('now')) as effective_to
    FROM project_assignments a
    JOIN users u ON u.id = a.pm_id
    JOIN projects p ON p.id = a.project_id
    ${where}
    ORDER BY u.name, a.assigned_from DESC
  `).all(...params).map(r => ({ ...r, billable: !!r.billable }));
}

// ── Report 5: Approval Report ────────────────────────────────────────────────
// approval_rate = approved_hours / submitted_hours (pending+approved+rejected)
function approvalReport({ dateFrom, dateTo, pmId } = {}) {
  const db = getDb();
  const conditions = ["e.status IN ('pending','approved','rejected')"];
  const params = [];
  if (dateFrom) { conditions.push('e.date >= ?'); params.push(dateFrom); }
  if (dateTo)   { conditions.push('e.date <= ?'); params.push(dateTo); }
  if (pmId)     { conditions.push('e.pm_id = ?'); params.push(pmId); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  return db.prepare(`
    SELECT
      u.id as pm_id, u.name as pm_name,
      SUM(e.hours) as submitted_hours,
      SUM(CASE WHEN e.status = 'approved' THEN e.hours ELSE 0 END) as approved_hours,
      SUM(CASE WHEN e.status = 'rejected' THEN e.hours ELSE 0 END) as rejected_hours,
      SUM(CASE WHEN e.status = 'pending'  THEN e.hours ELSE 0 END) as pending_hours,
      COUNT(*) as total_entries,
      SUM(CASE WHEN e.status = 'approved' THEN 1 ELSE 0 END) as approved_entries,
      SUM(CASE WHEN e.status = 'rejected' THEN 1 ELSE 0 END) as rejected_entries
    FROM time_entries e
    JOIN users u ON u.id = e.pm_id
    ${where}
    GROUP BY e.pm_id
    ORDER BY u.name
  `).all(...params).map(r => ({
    ...r,
    approval_rate: r.submitted_hours > 0
      ? Math.round((r.approved_hours / r.submitted_hours) * 1000) / 10
      : null,
  }));
}

function prevMonthOf(ym) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

module.exports = { monthlySummary, budgetReport, workloadReport, assignmentTimeline, approvalReport };
