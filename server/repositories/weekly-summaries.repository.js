const { getDb } = require('../../db/db');

function findByPmAndWeek(pmId, weekStart) {
  return getDb().prepare(
    'SELECT * FROM weekly_summaries WHERE pm_id = ? AND week_start = ?'
  ).get(pmId, weekStart) ?? null;
}

function findAllByWeek(weekStart) {
  return getDb().prepare(`
    SELECT ws.*, u.name as pm_name
    FROM weekly_summaries ws
    JOIN users u ON u.id = ws.pm_id
    WHERE ws.week_start = ?
    ORDER BY u.name
  `).all(weekStart);
}

function upsert(pmId, weekStart, highlights, blockers) {
  return getDb().prepare(`
    INSERT INTO weekly_summaries (pm_id, week_start, highlights, blockers, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(pm_id, week_start) DO UPDATE SET
      highlights = excluded.highlights,
      blockers   = excluded.blockers,
      updated_at = datetime('now')
  `).run(pmId, weekStart, highlights ?? '', blockers ?? '');
}

module.exports = { findByPmAndWeek, findAllByWeek, upsert };
