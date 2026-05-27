const suggestionsRepo = require('../repositories/suggestions.repository');
const audit = require('../utils/audit');

function list(userId, role) {
  return suggestionsRepo.findAll({ userId, role });
}

function create(userId, { title, description, category }) {
  const result = suggestionsRepo.create({ userId, title, description, category });
  audit.log(userId, 'CREATE', 'suggestion', result.lastInsertRowid, { title, category });
  return suggestionsRepo.findById(result.lastInsertRowid);
}

function updateStatus(adminId, id, { status, adminComment }) {
  const suggestion = suggestionsRepo.findById(id);
  if (!suggestion) throw { status: 404, message: 'Suggestion not found' };
  suggestionsRepo.updateStatus(id, { status, adminComment, updatedBy: adminId });
  audit.log(adminId, 'UPDATE_STATUS', 'suggestion', id, { status, adminComment });
  return suggestionsRepo.findById(id);
}

module.exports = { list, create, updateStatus };
