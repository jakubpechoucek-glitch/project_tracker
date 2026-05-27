const projectsRepo = require('../repositories/projects.repository');
const assignmentsRepo = require('../repositories/assignments.repository');
const audit = require('../utils/audit');

function listProjects(includeArchived = false) {
  const projects = projectsRepo.findAll({ includeArchived });
  return projects.map(p => ({
    ...p,
    billable: !!p.billable,
    hoursLogged: projectsRepo.getHoursLogged(p.id),
  }));
}

function getProject(id) {
  const project = projectsRepo.findById(id);
  if (!project) throw { status: 404, message: 'Project not found' };
  const hoursLogged = projectsRepo.getHoursLogged(id);
  const hoursLast30 = projectsRepo.getHoursLast30Days(id);
  const assignments = assignmentsRepo.findByProject(id);
  return { ...project, billable: !!project.billable, hoursLogged, hoursLast30, assignments };
}

function createProject(adminId, { name, description, budgetHours, billable, status }) {
  const result = projectsRepo.create({ name, description, budgetHours, billable, status });
  audit.log(adminId, 'CREATE', 'project', result.lastInsertRowid, { name, billable, budgetHours });
  return projectsRepo.findById(result.lastInsertRowid);
}

function updateProject(adminId, id, data) {
  const project = projectsRepo.findById(id);
  if (!project) throw { status: 404, message: 'Project not found' };
  projectsRepo.update(id, data);
  audit.log(adminId, 'UPDATE', 'project', id, data);
  return projectsRepo.findById(id);
}

function archiveProject(adminId, id) {
  const project = projectsRepo.findById(id);
  if (!project) throw { status: 404, message: 'Project not found' };
  if (project.status === 'archived') throw { status: 409, message: 'Project is already archived' };
  projectsRepo.archive(id);
  audit.log(adminId, 'ARCHIVE', 'project', id, { name: project.name });
}

module.exports = { listProjects, getProject, createProject, updateProject, archiveProject };
