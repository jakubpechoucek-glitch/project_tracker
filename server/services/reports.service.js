const { getDb } = require('../../db/db');
const { today } = require('../utils/date');

// ── Report 1: Monthly Summary ────────────────────────────────────────────────
// Hours per PM per project, grouped by month. Billable = project.billable = 1.
function monthlySummary({ month, pmId, projectId } = {}) {
  const db = getDb();
  const conditions = ["e.status IN ('draft','pending','approved')"];
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
      FROM time_entries e WHERE status IN ('draft','pending','approved')
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
// granularity: 'month' (default) | 'week' | 'day'
// avg_hours_day = total hours / days_worked in period
function workloadReport({ month, dateFrom, dateTo, pmId, granularity = 'month' } = {}) {
  const db = getDb();
  const conditions = ["e.status IN ('draft','pending','approved')"];
  const params = [];

  if (granularity === 'month' && month) {
    conditions.push("strftime('%Y-%m', e.date) = ?"); params.push(month);
  }
  if (dateFrom) { conditions.push('e.date >= ?'); params.push(dateFrom); }
  if (dateTo)   { conditions.push('e.date <= ?'); params.push(dateTo); }
  if (pmId)     { conditions.push('e.pm_id = ?'); params.push(pmId); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const periodExpr = granularity === 'week' ? "strftime('%Y-W%W', e.date)"
                   : granularity === 'day'  ? 'e.date'
                   :                          "strftime('%Y-%m', e.date)";

  const rows = db.prepare(`
    SELECT
      u.id as pm_id, u.name as pm_name,
      ${periodExpr} as period,
      COUNT(DISTINCT e.date) as days_worked,
      ROUND(SUM(e.hours), 1) as total_hours,
      ROUND(SUM(CASE WHEN p.billable = 1 THEN e.hours ELSE 0 END), 1) as billable_hours,
      ROUND(SUM(CASE WHEN p.billable = 0 THEN e.hours ELSE 0 END), 1) as non_billable_hours
    FROM time_entries e
    JOIN users u ON u.id = e.pm_id
    JOIN projects p ON p.id = e.project_id
    ${where}
    GROUP BY e.pm_id, ${periodExpr}
    ORDER BY u.name, period DESC
  `).all(...params);

  // 6-month trend per PM (only meaningful for month view)
  const trendMap = {};
  if (granularity === 'month') {
    const trend = db.prepare(`
      SELECT e.pm_id, strftime('%Y-%m', e.date) as month, SUM(e.hours) as total_hours
      FROM time_entries e
      WHERE e.status IN ('draft','pending','approved')
        AND e.date >= date('now', '-6 months')
      GROUP BY e.pm_id, strftime('%Y-%m', e.date)
      ORDER BY e.pm_id, month
    `).all();
    for (const t of trend) {
      if (!trendMap[t.pm_id]) trendMap[t.pm_id] = [];
      trendMap[t.pm_id].push({ month: t.month, total_hours: t.total_hours });
    }
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

// ── Report 6: Activity Breakdown ─────────────────────────────────────────────
// Hours per activity, optionally filtered by PM, project, and date range.
function activityBreakdown({ dateFrom, dateTo, pmId, projectId } = {}) {
  const db = getDb();
  const conditions = ["e.status IN ('draft','pending','approved')"];
  const params = [];
  if (dateFrom)  { conditions.push('e.date >= ?');      params.push(dateFrom); }
  if (dateTo)    { conditions.push('e.date <= ?');       params.push(dateTo); }
  if (pmId)      { conditions.push('e.pm_id = ?');       params.push(pmId); }
  if (projectId) { conditions.push('e.project_id = ?');  params.push(projectId); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const rows = db.prepare(`
    SELECT
      COALESCE(e.category, 'Other') as activity,
      ROUND(SUM(e.hours), 1)        as total_hours,
      COUNT(*)                      as entry_count,
      COUNT(DISTINCT e.pm_id)       as pm_count,
      COUNT(DISTINCT e.project_id)  as project_count
    FROM time_entries e
    ${where}
    GROUP BY COALESCE(e.category, 'Other')
    ORDER BY total_hours DESC
  `).all(...params);

  const grandTotal = rows.reduce((s, r) => s + r.total_hours, 0);
  return rows.map(r => ({
    ...r,
    pct: grandTotal > 0 ? Math.round((r.total_hours / grandTotal) * 1000) / 10 : 0,
  }));
}

// ── Report 7: Activity Breakdown by Project ──────────────────────────────────
// For each project: which activities were logged, how many hours, what %.
function activityByProject({ dateFrom, dateTo, pmId, projectId } = {}) {
  const db = getDb();
  const conditions = ["e.status IN ('draft','pending','approved')"];
  const params = [];
  if (dateFrom)  { conditions.push('e.date >= ?');      params.push(dateFrom); }
  if (dateTo)    { conditions.push('e.date <= ?');       params.push(dateTo); }
  if (pmId)      { conditions.push('e.pm_id = ?');       params.push(pmId); }
  if (projectId) { conditions.push('e.project_id = ?');  params.push(projectId); }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const rows = db.prepare(`
    SELECT
      p.id as project_id, p.name as project_name, p.billable,
      COALESCE(e.category, 'Other') as activity,
      ROUND(SUM(e.hours), 1)        as total_hours,
      COUNT(*)                      as entry_count
    FROM time_entries e
    JOIN projects p ON p.id = e.project_id
    ${where}
    GROUP BY p.id, COALESCE(e.category, 'Other')
    ORDER BY p.name, total_hours DESC
  `).all(...params);

  const map = {};
  for (const r of rows) {
    if (!map[r.project_id]) {
      map[r.project_id] = {
        project_id: r.project_id,
        project_name: r.project_name,
        billable: !!r.billable,
        total_hours: 0,
        activities: [],
      };
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

function prevMonthOf(ym) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

module.exports = { monthlySummary, budgetReport, workloadReport, assignmentTimeline, approvalReport, activityBreakdown, activityByProject };
