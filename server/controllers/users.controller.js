const usersService = require('../services/users.service');
const { success, created, error } = require('../utils/response');

async function list(req, res) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    success(res, usersService.listUsers(includeInactive));
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function get(req, res) {
  try {
    success(res, usersService.getUser(req.params.id));
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function create(req, res) {
  try {
    const user = await usersService.createUser(req.user.id, req.body);
    created(res, user);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function update(req, res) {
  try {
    const user = usersService.updateUser(req.user.id, req.params.id, req.body);
    success(res, user);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function deactivate(req, res) {
  try {
    usersService.deactivateUser(req.user.id, req.params.id, req.body.endDate);
    success(res, { message: 'User deactivated' });
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function reactivate(req, res) {
  try {
    usersService.reactivateUser(req.user.id, req.params.id);
    success(res, { message: 'User reactivated' });
  } catch (err) { error(res, err.message, err.status || 500); }
}

module.exports = { list, get, create, update, deactivate, reactivate };
