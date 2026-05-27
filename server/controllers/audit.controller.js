const auditRepo = require('../repositories/audit.repository');
const { success, error } = require('../utils/response');

async function list(req, res) {
  try {
    const { search, page, pageSize } = req.query;
    success(res, auditRepo.findAll({ search, page: parseInt(page) || 1, pageSize: parseInt(pageSize) || 20 }));
  } catch (err) { error(res, err.message, err.status || 500); }
}

module.exports = { list };
