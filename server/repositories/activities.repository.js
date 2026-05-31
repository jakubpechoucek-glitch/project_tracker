const { getDb } = require('../../db/db');

function findAll({ includeInactive = false } = {}) {
  const sql = includeInactive
    ? 'SELECT * FROM activities ORDER BY sort_order, name'
    : 'SELECT * FROM activities WHERE is_active = 1 ORDER BY sort_order, name';
  return getDb().prepare(sql).all();
}

function findById(id) {
  return getDb().prepare('SELECT * FROM activities WHERE id = ?').get(id);
}

function findByName(name) {
  return getDb().prepare('SELECT * FROM activities WHERE name = ?').get(name);
}

function create({ name, sortOrder = 0 }) {
  return getDb().prepare(
    'INSERT INTO activities (name, sort_order) VALUES (?, ?)'
  ).run(name, sortOrder);
}

function update(id, { name, sortOrder }) {
  return getDb().prepare(
    'UPDATE activities SET name = ?, sort_order = ? WHERE id = ?'
  ).run(name, sortOrder, id);
}

function setActive(id, isActive) {
  return getDb().prepare(
    'UPDATE activities SET is_active = ? WHERE id = ?'
  ).run(isActive ? 1 : 0, id);
}

module.exports = { findAll, findById, findByName, create, update, setActive };
