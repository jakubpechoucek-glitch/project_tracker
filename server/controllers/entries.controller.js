const entriesService = require('../services/entries.service');
const { success, created, error } = require('../utils/response');

async function list(req, res) {
  try {
    const { pmId, projectId, dateFrom, dateTo, category, status, page, pageSize } = req.query;
    const result = entriesService.listEntries({
      pmId: pmId ? parseInt(pmId) : undefined,
      projectId: projectId ? parseInt(projectId) : undefined,
      dateFrom, dateTo, category, status,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });
    success(res, result);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function getWeek(req, res) {
  try {
    const pmId = req.query.pmId ? parseInt(req.query.pmId) : req.user.id;
    if (pmId !== req.user.id && req.user.role !== 'admin') {
      return error(res, 'Access denied', 403);
    }
    success(res, entriesService.getWeekEntries(pmId, req.query.week));
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function create(req, res) {
  try {
    const pmId = req.user.role === 'admin' && req.body.pmId ? req.body.pmId : req.user.id;
    const result = await entriesService.createEntry(req.user.id, { ...req.body, pmId });
    created(res, result);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function update(req, res) {
  try {
    const entry = await entriesService.updateEntry(req.user.id, req.params.id, req.body);
    success(res, entry);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function remove(req, res) {
  try {
    entriesService.deleteEntry(req.user.id, req.params.id);
    success(res, { message: 'Entry deleted' });
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function submit(req, res) {
  try {
    const result = entriesService.submitWeek(req.user.id, req.body.week);
    success(res, result);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function approve(req, res) {
  try {
    const entry = entriesService.approveEntry(req.user.id, req.params.id);
    success(res, entry);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function reject(req, res) {
  try {
    const entry = entriesService.rejectEntry(req.user.id, req.params.id, req.body.reason);
    success(res, entry);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function reopen(req, res) {
  try {
    const entry = entriesService.reopenEntry(req.user.id, req.params.id);
    success(res, entry);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function approveWeek(req, res) {
  try {
    const result = entriesService.approveWeek(req.user.id, req.body.pmId, req.body.week);
    success(res, result);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function rejectWeek(req, res) {
  try {
    const result = entriesService.rejectWeek(req.user.id, req.body.pmId, req.body.week, req.body.reason);
    success(res, result);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function pending(req, res) {
  try {
    success(res, entriesService.getPendingApprovals());
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function adminDashboard(req, res) {
  try {
    success(res, entriesService.getAdminDashboard());
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function pmDashboard(req, res) {
  try {
    success(res, entriesService.getPmDashboard(req.user.id));
  } catch (err) { error(res, err.message, err.status || 500); }
}

module.exports = { list, getWeek, create, update, remove, submit, approve, reject, reopen, approveWeek, rejectWeek, pending, adminDashboard, pmDashboard };
