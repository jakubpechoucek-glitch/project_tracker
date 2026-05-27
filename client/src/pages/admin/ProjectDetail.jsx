import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import BudgetBar from '../../components/ui/BudgetBar';
import { SkeletonCard } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/projects/${id}`).then(r => setProject(r.data.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AppLayout title="Project"><SkeletonCard /></AppLayout>;
  if (!project) return <AppLayout title="Project"><p className="text-gray-500">Project not found.</p></AppLayout>;

  return (
    <AppLayout title={project.name}>
      <div className="space-y-6 max-w-3xl">
        <Link to="/admin/projects" className="text-sm text-primary hover:underline">← Back to Projects</Link>

        <div className="card card-body space-y-4">
          <div className="flex items-center gap-3">
            <h1>{project.name}</h1>
            <StatusBadge status={project.status} />
            {project.billable ? <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">Billable</span> : <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Non-billable</span>}
          </div>
          {project.description && <p className="text-sm text-gray-600">{project.description}</p>}
          <BudgetBar logged={project.hoursLogged} budget={project.budget_hours} forecast={project.forecast_date} />
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-gray-400">Budget</p><p className="font-semibold">{project.budget_hours}h</p></div>
            <div><p className="text-xs text-gray-400">Logged</p><p className="font-semibold">{project.hoursLogged?.toFixed(1)}h</p></div>
            <div><p className="text-xs text-gray-400">Remaining</p><p className="font-semibold">{Math.max(0, project.budget_hours - project.hoursLogged).toFixed(1)}h</p></div>
          </div>
        </div>

        <div className="card">
          <div className="card-body border-b border-gray-100"><h2>Assignments</h2></div>
          {project.assignments?.length === 0 ? (
            <div className="p-6 text-sm text-gray-400 text-center">No assignments yet.</div>
          ) : (
            <table className="table-base">
              <thead><tr><th>PM</th><th>Email</th><th>From</th><th>To</th></tr></thead>
              <tbody>
                {project.assignments.map(a => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.pm_name}</td>
                    <td className="text-gray-500">{a.pm_email}</td>
                    <td>{a.assigned_from}</td>
                    <td>{a.assigned_to || <span className="text-green-600 text-xs font-medium">Active</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
