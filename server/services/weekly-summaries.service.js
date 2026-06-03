const repo = require('../repositories/weekly-summaries.repository');
const { weekStartOf } = require('../utils/date');

function getSummary(pmId, weekStart) {
  const ws = weekStartOf(weekStart);
  return repo.findByPmAndWeek(pmId, ws) ?? { pm_id: pmId, week_start: ws, highlights: '', blockers: '' };
}

function getAllSummaries(weekStart) {
  const ws = weekStartOf(weekStart);
  return repo.findAllByWeek(ws);
}

function upsertSummary(pmId, weekStart, highlights, blockers) {
  const ws = weekStartOf(weekStart);
  repo.upsert(pmId, ws, highlights, blockers);
  return repo.findByPmAndWeek(pmId, ws);
}

module.exports = { getSummary, getAllSummaries, upsertSummary };
