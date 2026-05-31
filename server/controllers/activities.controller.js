const svc = require('../services/activities.service');
const { success, created, error } = require('../utils/response');

async function list(req, res) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    success(res, svc.listActivities({ includeInactive }));
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function create(req, res) {
  try {
    const activity = svc.createActivity(req.user.id, req.body);
    created(res, activity);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function update(req, res) {
  try {
    const activity = svc.updateActivity(req.user.id, req.params.id, req.body);
    success(res, activity);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function deactivate(req, res) {
  try {
    svc.deactivateActivity(req.user.id, req.params.id);
    success(res, { message: 'Activity deactivated' });
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function reactivate(req, res) {
  try {
    svc.reactivateActivity(req.user.id, req.params.id);
    success(res, { message: 'Activity reactivated' });
  } catch (err) { error(res, err.message, err.status || 500); }
}

module.exports = { list, create, update, deactivate, reactivate };
