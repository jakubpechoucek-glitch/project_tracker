const repo = require('../repositories/activities.repository');
const audit = require('../utils/audit');

function listActivities({ includeInactive = false } = {}) {
  return repo.findAll({ includeInactive });
}

function createActivity(adminId, { name, sortOrder }) {
  if (!name || !name.trim()) throw { status: 422, message: 'Activity name is required' };
  const trimmed = name.trim();
  if (repo.findByName(trimmed)) throw { status: 409, message: 'An activity with this name already exists' };
  const result = repo.create({ name: trimmed, sortOrder: sortOrder ?? 0 });
  const activity = repo.findById(result.lastInsertRowid);
  audit.log(adminId, 'CREATE', 'activity', activity.id, { name: trimmed });
  return activity;
}

function updateActivity(adminId, id, { name, sortOrder }) {
  const existing = repo.findById(id);
  if (!existing) throw { status: 404, message: 'Activity not found' };
  const trimmed = name?.trim() || existing.name;
  const dupe = repo.findByName(trimmed);
  if (dupe && dupe.id !== parseInt(id, 10)) throw { status: 409, message: 'An activity with this name already exists' };
  repo.update(id, { name: trimmed, sortOrder: sortOrder ?? existing.sort_order });
  audit.log(adminId, 'UPDATE', 'activity', id, { name: trimmed });
  return repo.findById(id);
}

function deactivateActivity(adminId, id) {
  const existing = repo.findById(id);
  if (!existing) throw { status: 404, message: 'Activity not found' };
  if (!existing.is_active) throw { status: 409, message: 'Activity is already inactive' };
  repo.setActive(id, false);
  audit.log(adminId, 'DEACTIVATE', 'activity', id, { name: existing.name });
}

function reactivateActivity(adminId, id) {
  const existing = repo.findById(id);
  if (!existing) throw { status: 404, message: 'Activity not found' };
  if (existing.is_active) throw { status: 409, message: 'Activity is already active' };
  repo.setActive(id, true);
  audit.log(adminId, 'REACTIVATE', 'activity', id, { name: existing.name });
}

module.exports = { listActivities, createActivity, updateActivity, deactivateActivity, reactivateActivity };
