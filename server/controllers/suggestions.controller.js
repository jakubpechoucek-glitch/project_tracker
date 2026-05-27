const suggestionsService = require('../services/suggestions.service');
const { success, created, error } = require('../utils/response');

async function list(req, res) {
  try {
    success(res, suggestionsService.list(req.user.id, req.user.role));
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function create(req, res) {
  try {
    const suggestion = suggestionsService.create(req.user.id, req.body);
    created(res, suggestion);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function updateStatus(req, res) {
  try {
    const suggestion = suggestionsService.updateStatus(req.user.id, req.params.id, req.body);
    success(res, suggestion);
  } catch (err) { error(res, err.message, err.status || 500); }
}

module.exports = { list, create, updateStatus };
