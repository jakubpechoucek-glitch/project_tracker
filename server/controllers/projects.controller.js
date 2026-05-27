const projectsService = require('../services/projects.service');
const { success, created, error } = require('../utils/response');

async function list(req, res) {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    success(res, projectsService.listProjects(includeArchived));
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function get(req, res) {
  try {
    success(res, projectsService.getProject(req.params.id));
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function create(req, res) {
  try {
    const project = projectsService.createProject(req.user.id, req.body);
    created(res, project);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function update(req, res) {
  try {
    const project = projectsService.updateProject(req.user.id, req.params.id, req.body);
    success(res, project);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function archive(req, res) {
  try {
    projectsService.archiveProject(req.user.id, req.params.id);
    success(res, { message: 'Project archived' });
  } catch (err) { error(res, err.message, err.status || 500); }
}

module.exports = { list, get, create, update, archive };
