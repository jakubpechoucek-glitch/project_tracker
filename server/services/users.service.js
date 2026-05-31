const bcrypt = require('bcryptjs');
const usersRepo = require('../repositories/users.repository');
const assignmentsRepo = require('../repositories/assignments.repository');
const audit = require('../utils/audit');
const { today } = require('../utils/date');
const { PASSWORD_POLICY } = require('./auth.service');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

function listUsers(includeInactive = false) {
  return usersRepo.findAll({ includeInactive });
}

function getUser(id) {
  const user = usersRepo.findById(id);
  if (!user) throw { status: 404, message: 'User not found' };
  const stats = usersRepo.getUserStats(id);
  const assignments = assignmentsRepo.findByPm(id);
  return { ...user, password_hash: undefined, ...stats, assignments };
}

async function createUser(adminId, { name, email, password, role = 'pm' }) {
  const existing = usersRepo.findByEmail(email);
  if (existing) throw { status: 409, message: 'A user with this email already exists' };

  if (!['pm', 'admin'].includes(role)) {
    throw { status: 422, message: 'Role must be pm or admin' };
  }

  if (!PASSWORD_POLICY.test(password)) {
    throw { status: 422, message: 'Password must be at least 8 characters with uppercase, lowercase, and a number' };
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const result = usersRepo.create({ name, email, passwordHash: hash, role, isFirstLogin: 1 });
  audit.log(adminId, 'CREATE', 'user', result.lastInsertRowid, { name, email, role });
  return usersRepo.findById(result.lastInsertRowid);
}

function updateUser(adminId, id, { name, email }) {
  const user = usersRepo.findById(id);
  if (!user) throw { status: 404, message: 'User not found' };

  const existing = usersRepo.findByEmail(email);
  if (existing && existing.id !== parseInt(id, 10)) {
    throw { status: 409, message: 'Email is already in use by another user' };
  }

  usersRepo.update(id, { name, email });
  audit.log(adminId, 'UPDATE', 'user', id, { name, email });
  return usersRepo.findById(id);
}

function deactivateUser(adminId, id, endDate) {
  const user = usersRepo.findById(id);
  if (!user) throw { status: 404, message: 'User not found' };
  if (!user.is_active) throw { status: 409, message: 'User is already inactive' };
  if (user.role === 'admin') throw { status: 409, message: 'Cannot deactivate admin accounts' };

  const endOn = endDate || today();
  usersRepo.deactivate(id);
  assignmentsRepo.endAllActiveForPm(id, endOn);
  audit.log(adminId, 'DEACTIVATE', 'user', id, { name: user.name, ended_assignments_on: endOn });
}

function reactivateUser(adminId, id) {
  const user = usersRepo.findById(id);
  if (!user) throw { status: 404, message: 'User not found' };
  if (user.is_active) throw { status: 409, message: 'User is already active' };

  usersRepo.reactivate(id);
  audit.log(adminId, 'REACTIVATE', 'user', id, { name: user.name });
}

module.exports = { listUsers, getUser, createUser, updateUser, deactivateUser, reactivateUser };
