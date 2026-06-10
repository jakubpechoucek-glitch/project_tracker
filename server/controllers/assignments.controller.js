const assignmentsService = require('../services/assignments.service');
const { success, created, error } = require('../utils/response');

async function list(req, res) {
  try {
    const { pmId, projectId, active } = req.query;
    if (active === 'true') return success(res, assignmentsService.listActive());
    if (pmId) return success(res, assignmentsService.listByPm(pmId));
    if (projectId) return success(res, assignmentsService.listByProject(projectId));
    success(res, assignmentsService.listAssignments());
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function create(req, res) {
  try {
    const { pmIds, pmId } = req.body;
    if (Array.isArray(pmIds) && pmIds.length > 0) {
      const result = assignmentsService.createAssignments(req.user.id, req.body);
      created(res, result);
    } else {
      const assignment = assignmentsService.createAssignment(req.user.id, req.body);
      created(res, assignment);
    }
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function endAssignment(req, res) {
  try {
    assignmentsService.endAssignment(req.user.id, req.params.id, req.body.assignedTo);
    success(res, { message: 'Assignment ended' });
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function myProjects(req, res) {
  try {
    success(res, assignmentsService.getActivePmProjects(req.user.id));
  } catch (err) { error(res, err.message, err.status || 500); }
}

module.exports = { list, create, endAssignment, myProjects };
