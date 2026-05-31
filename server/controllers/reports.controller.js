const reportsService = require('../services/reports.service');
const { success, error } = require('../utils/response');
const { csvResponse } = require('../utils/csv');
const { today } = require('../utils/date');

function toFilename(name) {
  return `${name}_${today()}.csv`;
}

async function monthly(req, res) {
  try {
    const data = reportsService.monthlySummary(req.query);
    if (req.query.export === 'csv') {
      return csvResponse(res, toFilename('monthly-summary'), data, [
        { key: 'month', label: 'Month' },
        { key: 'pm_name', label: 'PM Name' },
        { key: 'project_name', label: 'Project' },
        { key: 'total_hours', label: 'Total Hours' },
        { key: 'billable_hours', label: 'Billable Hours' },
        { key: 'non_billable_hours', label: 'Non-Billable Hours' },
        { key: 'prev_month_hours', label: 'Prev Month Hours' },
      ]);
    }
    success(res, data);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function budget(req, res) {
  try {
    const data = reportsService.budgetReport(req.query);
    if (req.query.export === 'csv') {
      return csvResponse(res, toFilename('budget-report'), data, [
        { key: 'project_name', label: 'Project' },
        { key: 'status', label: 'Status' },
        { key: 'budget_hours', label: 'Budget Hours' },
        { key: 'hours_logged', label: 'Hours Logged' },
        { key: 'pct_consumed', label: '% Consumed' },
        { key: 'hours_remaining', label: 'Hours Remaining' },
        { key: 'burn_rate_per_day', label: 'Burn Rate (h/day)' },
        { key: 'forecast_date', label: 'Forecast Completion' },
      ]);
    }
    success(res, data);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function workload(req, res) {
  try {
    const data = reportsService.workloadReport(req.query);
    if (req.query.export === 'csv') {
      const periodLabel = req.query.granularity === 'week' ? 'Week'
                        : req.query.granularity === 'day'  ? 'Date'
                        :                                    'Month';
      return csvResponse(res, toFilename('pm-workload'), data, [
        { key: 'pm_name', label: 'PM Name' },
        { key: 'period', label: periodLabel },
        { key: 'total_hours', label: 'Total Hours' },
        { key: 'billable_hours', label: 'Billable Hours' },
        { key: 'non_billable_hours', label: 'Non-Billable Hours' },
        { key: 'days_worked', label: 'Days Worked' },
        { key: 'avg_hours_day', label: 'Avg Hours/Day' },
      ]);
    }
    success(res, data);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function timeline(req, res) {
  try {
    const data = reportsService.assignmentTimeline(req.query);
    if (req.query.export === 'csv') {
      return csvResponse(res, toFilename('assignment-timeline'), data, [
        { key: 'pm_name', label: 'PM Name' },
        { key: 'project_name', label: 'Project' },
        { key: 'assigned_from', label: 'From' },
        { key: 'assigned_to', label: 'To' },
        { key: 'effective_to', label: 'Effective To' },
      ]);
    }
    success(res, data);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function approval(req, res) {
  try {
    const data = reportsService.approvalReport(req.query);
    if (req.query.export === 'csv') {
      return csvResponse(res, toFilename('approval-report'), data, [
        { key: 'pm_name', label: 'PM Name' },
        { key: 'submitted_hours', label: 'Submitted Hours' },
        { key: 'approved_hours', label: 'Approved Hours' },
        { key: 'rejected_hours', label: 'Rejected Hours' },
        { key: 'pending_hours', label: 'Pending Hours' },
        { key: 'approval_rate', label: 'Approval Rate (%)' },
      ]);
    }
    success(res, data);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function activity(req, res) {
  try {
    const data = reportsService.activityBreakdown(req.query);
    if (req.query.export === 'csv') {
      return csvResponse(res, toFilename('activity-breakdown'), data, [
        { key: 'activity',      label: 'Activity' },
        { key: 'total_hours',   label: 'Total Hours' },
        { key: 'pct',           label: '% of Total' },
        { key: 'entry_count',   label: 'Entries' },
        { key: 'pm_count',      label: 'PMs' },
        { key: 'project_count', label: 'Projects' },
      ]);
    }
    success(res, data);
  } catch (err) { error(res, err.message, err.status || 500); }
}

async function activityProject(req, res) {
  try {
    const data = reportsService.activityByProject(req.query);
    if (req.query.export === 'csv') {
      // Flatten nested structure for CSV
      const flat = data.flatMap(p =>
        p.activities.map(a => ({
          project_name: p.project_name,
          billable: p.billable ? 'Yes' : 'No',
          project_total_hours: p.total_hours,
          activity: a.activity,
          activity_hours: a.total_hours,
          pct_of_project: a.pct,
          entry_count: a.entry_count,
        }))
      );
      return csvResponse(res, toFilename('activity-by-project'), flat, [
        { key: 'project_name',       label: 'Project' },
        { key: 'billable',           label: 'Billable' },
        { key: 'project_total_hours',label: 'Project Total (h)' },
        { key: 'activity',           label: 'Activity' },
        { key: 'activity_hours',     label: 'Activity Hours' },
        { key: 'pct_of_project',     label: '% of Project' },
        { key: 'entry_count',        label: 'Entries' },
      ]);
    }
    success(res, data);
  } catch (err) { error(res, err.message, err.status || 500); }
}

module.exports = { monthly, budget, workload, timeline, approval, activity, activityProject };
