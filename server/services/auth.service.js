const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usersRepo = require('../repositories/users.repository');
const audit = require('../utils/audit');

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

async function login(email, password) {
  const user = usersRepo.findByEmail(email);

  if (!user) {
    throw { status: 401, message: 'Invalid email or password' };
  }

  if (!user.is_active) {
    audit.log(user.id, 'LOGIN_FAILED', 'user', user.id, { reason: 'account_inactive' });
    throw { status: 403, message: 'Your account is deactivated. Contact your administrator.' };
  }

  // Lock check
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    throw { status: 429, message: `Account locked due to too many failed attempts. Try again in ${minutes} minute(s).` };
  }

  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    usersRepo.incrementFailedLogin(user.id);
    const updated = usersRepo.findById(user.id);
    if (updated.failed_login_count >= MAX_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
      usersRepo.lockAccount(user.id, lockUntil);
      audit.log(user.id, 'ACCOUNT_LOCKED', 'user', user.id, { attempts: MAX_ATTEMPTS });
      throw { status: 429, message: `Too many failed attempts. Account locked for ${LOCK_MINUTES} minutes.` };
    }
    audit.log(user.id, 'LOGIN_FAILED', 'user', user.id, { attempt: updated.failed_login_count });
    throw { status: 401, message: 'Invalid email or password' };
  }

  usersRepo.resetLoginAttempts(user.id);
  audit.log(user.id, 'LOGIN_SUCCESS', 'user', user.id, { email: user.email });

  const token = issueToken(user);
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, isFirstLogin: !!user.is_first_login } };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = usersRepo.findById(userId);
  if (!user) throw { status: 404, message: 'User not found' };

  // Skip current password check on first login
  if (!user.is_first_login) {
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw { status: 401, message: 'Current password is incorrect' };
  }

  if (!PASSWORD_POLICY.test(newPassword)) {
    throw { status: 422, message: 'Password must be at least 8 characters with uppercase, lowercase, and a number' };
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  usersRepo.updatePassword(userId, hash);
  audit.log(userId, 'PASSWORD_CHANGED', 'user', userId, {});
}

function me(userId) {
  const user = usersRepo.findById(userId);
  if (!user) throw { status: 404, message: 'User not found' };
  return { id: user.id, name: user.name, email: user.email, role: user.role, isFirstLogin: !!user.is_first_login };
}

module.exports = { login, changePassword, me, PASSWORD_POLICY };
