const svc = require('../services/weekly-summaries.service');
const { success, error } = require('../utils/response');
const { today } = require('../utils/date');

async function get(req, res) {
  try {
    const weekStart = req.query.weekStart || today();
    if (req.user.role === 'admin') {
      return success(res, svc.getAllSummaries(weekStart));
    }
    success(res, svc.getSummary(req.user.id, weekStart));
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function upsert(req, res) {
  try {
    const weekStart = req.query.weekStart || today();
    const { highlights, blockers } = req.body;
    const result = svc.upsertSummary(req.user.id, weekStart, highlights, blockers);
    success(res, result);
  } catch (err) { error(res, err.message, err.status || 500); }
}

module.exports = { get, upsert };
