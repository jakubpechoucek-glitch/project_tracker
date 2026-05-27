const assignmentsRepo = require('../repositories/assignments.repository');
const usersRepo = require('../repositories/users.repository');
const projectsRepo = require('../repositories/projects.repository');
const audit = require('../utils/audit');
const { today, weekStartOf } = require('../utils/date');

function listAssignments() {
  return assignmentsRepo.findAll();
}

function listActive() {
  return assignmentsRepo.findActive();
}

function listByPm(pmId) {
  return assignmentsRepo.findByPm(pmId);
}

function listByProject(projectId) {
  return assignmentsRepo.findByProject(projectId);
}

function createAssignment(adminId, { pmId, projectId, assignedFrom }) {
  // Default to Monday of the current week so new PMs can log the whole week immediately
  const from = assignedFrom || weekStartOf(today());
  const user = usersRepo.findById(pmId);
  if (!user || user.role !== 'pm') throw { status: 404, message: 'PM not found' };
  if (!user.is_active) throw { status: 409, message: 'Cannot assign a deactivated PM' };

  const project = projectsRepo.findById(projectId);
  if (!project) throw { status: 404, message: 'Project not found' };
  if (project.status === 'archived') throw { status: 409, message: 'Cannot assign PM to an archived project' };

  const overlap = assignmentsRepo.findOverlap(pmId, projectId);
  if (overlap) throw { status: 409, message: 'This PM already has an active assignment on this project. End the existing assignment first.' };

  const result = assignmentsRepo.create({ pmId, projectId, assignedFrom: from });
  audit.log(adminId, 'ASSIGN', 'assignment', result.lastInsertRowid, {
    pm: user.name, project: project.name, from
  });
  return assignmentsRepo.findById(result.lastInsertRowid);
}

function endAssignment(adminId, assignmentId, assignedTo) {
  const assignment = assignmentsRepo.findById(assignmentId);
  if (!assignment) throw { status: 404, message: 'Assignment not found' };
  if (assignment.assigned_to) throw { status: 409, message: 'Assignment already ended' };

  const endDate = assignedTo || today();
  if (endDate < assignment.assigned_from) {
    throw { status: 422, message: 'End date cannot be before the assignment start date' };
  }

  assignmentsRepo.endAssignment(assignmentId, endDate);
  audit.log(adminId, 'END_ASSIGNMENT', 'assignment', assignmentId, {
    pm_id: assignment.pm_id, project_id: assignment.project_id, ended_on: endDate
  });
}

function getActivePmProjects(pmId) {
  return assignmentsRepo.findActivePmProjects(pmId);
}

module.exports = { listAssignments, listActive, listByPm, listByProject, createAssignment, endAssignment, getActivePmProjects };
