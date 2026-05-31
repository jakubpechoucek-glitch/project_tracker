const entriesRepo = require('../repositories/entries.repository');
const assignmentsRepo = require('../repositories/assignments.repository');
const projectsRepo = require('../repositories/projects.repository');
const usersRepo = require('../repositories/users.repository');
const audit = require('../utils/audit');
const { weekStartOf, weekEndOf, today } = require('../utils/date');

const MAX_HOURS_PER_ENTRY = 12;
const MAX_HOURS_PER_DAY = 24;
const WARN_HOURS_PER_DAY = 8;
const MIN_HOURS = 1 / 6;          // 10 minutes
const HOUR_INCREMENT = 1 / 6;     // 10-minute steps

function validateHours(hours) {
  if (hours < MIN_HOURS) throw { status: 422, message: 'Minimum time per entry is 10 minutes' };
  if (hours > MAX_HOURS_PER_ENTRY) throw { status: 422, message: `Maximum hours per entry is ${MAX_HOURS_PER_ENTRY}` };
  // Must be a multiple of 10 minutes (allow ±1 sec rounding tolerance)
  if (Math.round(hours * 60) % 10 !== 0) throw { status: 422, message: 'Time must be in 10-minute increments' };
}

async function validateEntryContext(pmId, projectId, date, excludeEntryId = null) {
  const project = projectsRepo.findById(projectId);
  if (!project) throw { status: 404, message: 'Project not found' };
  if (project.status === 'archived') throw { status: 422, message: 'Cannot log time on an archived project' };

  const user = usersRepo.findById(pmId);
  if (!user || !user.is_active) throw { status: 422, message: 'Deactivated users cannot log time' };

  const assigned = assignmentsRepo.isAssignedOnDate(pmId, projectId, date);
  if (!assigned) throw { status: 422, message: `You are not assigned to "${project.name}" on ${date}. Check your assignment period.` };

  return project;
}

function listEntries(filters) {
  return entriesRepo.findAll(filters);
}

function getWeekEntries(pmId, weekDateStr) {
  const start = weekStartOf(weekDateStr || today());
  const end = weekEndOf(weekDateStr || today());
  const entries = entriesRepo.findByPmAndWeek(pmId, start, end);
  return { weekStart: start, weekEnd: end, entries };
}

async function createEntry(actorId, { pmId, projectId, date, hours, category, description }) {
  validateHours(hours);
  await validateEntryContext(pmId, projectId, date);

  const dup = entriesRepo.findDuplicate(pmId, projectId, date);
  if (dup) throw { status: 409, message: `An entry already exists for this project on ${date}` };

  const dailyTotal = entriesRepo.getDailyTotal(pmId, date);
  if (dailyTotal + hours > MAX_HOURS_PER_DAY) {
    throw { status: 422, message: `This entry would bring the total for ${date} to ${dailyTotal + hours}h, exceeding the 24-hour limit` };
  }

  const result = entriesRepo.create({ pmId, projectId, date, hours, category, description });
  const entry = entriesRepo.findById(result.lastInsertRowid);
  audit.log(actorId, 'CREATE', 'time_entry', result.lastInsertRowid, { pmId, projectId, date, hours });

  const warnings = [];
  if (dailyTotal + hours > WARN_HOURS_PER_DAY) {
    warnings.push(`Daily total for ${date} is ${dailyTotal + hours}h (exceeds 8h)`);
  }

  return { entry, warnings };
}

async function updateEntry(actorId, entryId, { hours, category, description, date }) {
  const entry = entriesRepo.findById(entryId);
  if (!entry) throw { status: 404, message: 'Entry not found' };

  if (actorId !== entry.pm_id) {
    const actor = usersRepo.findById(actorId);
    if (!actor || actor.role !== 'admin') throw { status: 403, message: 'You can only edit your own entries' };
  }

  if (entry.status === 'approved' || entry.status === 'pending') {
    const actor = usersRepo.findById(actorId);
    if (!actor || actor.role !== 'admin') {
      throw { status: 403, message: 'This entry is locked. Only an admin can edit submitted entries.' };
    }
  }

  validateHours(hours ?? entry.hours);

  const newDate = date ?? entry.date;
  const newProjectId = entry.project_id;
  await validateEntryContext(entry.pm_id, newProjectId, newDate);

  const dup = entriesRepo.findDuplicate(entry.pm_id, newProjectId, newDate, entryId);
  if (dup) throw { status: 409, message: `Another entry already exists for this project on ${newDate}` };

  const dailyTotal = entriesRepo.getDailyTotal(entry.pm_id, newDate, entryId);
  const newHours = hours ?? entry.hours;
  if (dailyTotal + newHours > MAX_HOURS_PER_DAY) {
    throw { status: 422, message: `This update would bring the total for ${newDate} to ${dailyTotal + newHours}h, exceeding the 24-hour limit` };
  }

  entriesRepo.update(entryId, {
    hours: newHours,
    category: category ?? entry.category,
    description: description ?? entry.description,
    date: newDate,
  });

  audit.log(actorId, 'UPDATE', 'time_entry', entryId, { hours, category, date });
  return entriesRepo.findById(entryId);
}

function deleteEntry(actorId, entryId) {
  const entry = entriesRepo.findById(entryId);
  if (!entry) throw { status: 404, message: 'Entry not found' };

  if (actorId !== entry.pm_id) {
    const actor = usersRepo.findById(actorId);
    if (!actor || actor.role !== 'admin') throw { status: 403, message: 'You can only delete your own entries' };
  }

  if (entry.status !== 'draft') {
    const actor = usersRepo.findById(actorId);
    if (!actor || actor.role !== 'admin') {
      throw { status: 403, message: 'Only draft entries can be deleted. Ask an admin to reopen this entry.' };
    }
  }

  entriesRepo.remove(entryId);
  audit.log(actorId, 'DELETE', 'time_entry', entryId, { date: entry.date, hours: entry.hours, project_id: entry.project_id });
}

function submitWeek(pmId, weekDateStr) {
  const start = weekStartOf(weekDateStr || today());
  const end = weekEndOf(weekDateStr || today());
  const result = entriesRepo.submitWeek(pmId, start, end);
  if (result.changes === 0) throw { status: 409, message: 'No draft entries found for this week to submit' };
  audit.log(pmId, 'SUBMIT_WEEK', 'time_entry', null, { week_start: start, week_end: end, entries_submitted: result.changes });
  return { submitted: result.changes, weekStart: start, weekEnd: end };
}

function approveEntry(adminId, entryId) {
  const entry = entriesRepo.findById(entryId);
  if (!entry) throw { status: 404, message: 'Entry not found' };
  if (entry.status !== 'pending') throw { status: 409, message: 'Only pending entries can be approved' };
  const now = new Date().toISOString();
  entriesRepo.updateStatus(entryId, { status: 'approved', approvedBy: adminId, approvedAt: now, rejectionReason: null });
  audit.log(adminId, 'APPROVE', 'time_entry', entryId, { pm_id: entry.pm_id });
  return entriesRepo.findById(entryId);
}

function rejectEntry(adminId, entryId, reason) {
  const entry = entriesRepo.findById(entryId);
  if (!entry) throw { status: 404, message: 'Entry not found' };
  if (entry.status !== 'pending') throw { status: 409, message: 'Only pending entries can be rejected' };
  if (!reason || reason.trim().length < 5) throw { status: 422, message: 'Rejection reason must be at least 5 characters' };
  entriesRepo.updateStatus(entryId, { status: 'rejected', approvedBy: null, approvedAt: null, rejectionReason: reason });
  audit.log(adminId, 'REJECT', 'time_entry', entryId, { pm_id: entry.pm_id, reason });
  return entriesRepo.findById(entryId);
}

function reopenEntry(adminId, entryId) {
  const entry = entriesRepo.findById(entryId);
  if (!entry) throw { status: 404, message: 'Entry not found' };
  if (entry.status !== 'approved') throw { status: 409, message: 'Only approved entries can be reopened' };
  entriesRepo.updateStatus(entryId, { status: 'draft', approvedBy: null, approvedAt: null, rejectionReason: null });
  audit.log(adminId, 'REOPEN', 'time_entry', entryId, { pm_id: entry.pm_id });
  return entriesRepo.findById(entryId);
}

function approveWeek(adminId, pmId, weekDateStr) {
  const start = weekStartOf(weekDateStr);
  const end = weekEndOf(weekDateStr);
  const pending = entriesRepo.findPendingForPmWeek(pmId, start, end);
  if (pending.length === 0) throw { status: 409, message: 'No pending entries found for this PM/week' };
  const now = new Date().toISOString();
  for (const e of pending) {
    entriesRepo.updateStatus(e.id, { status: 'approved', approvedBy: adminId, approvedAt: now, rejectionReason: null });
  }
  audit.log(adminId, 'APPROVE_WEEK', 'time_entry', null, { pm_id: pmId, week_start: start, count: pending.length });
  return { approved: pending.length };
}

function rejectWeek(adminId, pmId, weekDateStr, reason) {
  const start = weekStartOf(weekDateStr);
  const end = weekEndOf(weekDateStr);
  const pending = entriesRepo.findPendingForPmWeek(pmId, start, end);
  if (pending.length === 0) throw { status: 409, message: 'No pending entries found for this PM/week' };
  if (!reason || reason.trim().length < 5) throw { status: 422, message: 'Rejection reason required (min 5 chars)' };
  for (const e of pending) {
    entriesRepo.updateStatus(e.id, { status: 'rejected', approvedBy: null, approvedAt: null, rejectionReason: reason });
  }
  audit.log(adminId, 'REJECT_WEEK', 'time_entry', null, { pm_id: pmId, week_start: start, reason, count: pending.length });
  return { rejected: pending.length };
}

function getPendingApprovals() {
  return entriesRepo.findPendingGroupedByPmWeek();
}

function getAdminDashboard() {
  const summary = entriesRepo.getAdminWeeklySummary();
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const month = `${y}-${m}`;
  const monthStart = `${y}-${m}-01`;
  const monthEnd = new Date(y, now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const hoursPerProject = entriesRepo.getHoursPerProject(month);
  const activeAssignments = assignmentsRepo.findActive();
  const activityBreakdown = entriesRepo.getActivityBreakdownAdmin(monthStart, monthEnd);
  return { summary, hoursPerProject, activeAssignments, activityBreakdown };
}

function getPmDashboard(pmId) {
  const summary = entriesRepo.getWeeklySummary(pmId);
  const activeProjects = assignmentsRepo.findActivePmProjects(pmId);
  // This week Mon–Sun
  const weekStart = weekStartOf(today());
  const weekEnd   = weekEndOf(today());
  const activityBreakdown = entriesRepo.getActivityBreakdownPm(pmId, weekStart, weekEnd);
  return { summary, activeProjects, activityBreakdown };
}

const { findActive: findActiveAssignments } = require('../repositories/assignments.repository');

module.exports = {
  listEntries, getWeekEntries, createEntry, updateEntry, deleteEntry,
  submitWeek, approveEntry, rejectEntry, reopenEntry, approveWeek, rejectWeek,
  getPendingApprovals, getAdminDashboard, getPmDashboard,
};
