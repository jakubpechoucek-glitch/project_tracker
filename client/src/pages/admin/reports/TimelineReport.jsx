import { useEffect, useState } from 'react';
import api from '../../../services/api';
import { SkeletonTable } from '../../../components/ui/LoadingSkeleton';
import EmptyState from '../../../components/ui/EmptyState';

const LinkIcon = () => <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;

export default function TimelineReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ pmId: '', projectId: '' });
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data.data.filter(u => u.role === 'pm')));
    api.get('/projects?includeArchived=true').then(r => setProjects(r.data.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)));
    api.get(`/reports/timeline?${params}`).then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, [filters]);

  const exportCSV = () => {
    const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)), export: 'csv' });
    window.open(`/api/reports/timeline?${params}`);
  };

  return (
    <div className="space-y-4">
      <div className="card card-body flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">PM</label>
          <select className="input w-40" value={filters.pmId} onChange={e => setFilters(f => ({ ...f, pmId: e.target.value }))}>
            <option value="">All PMs</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">Project</label>
          <select className="input w-48" value={filters.projectId} onChange={e => setFilters(f => ({ ...f, projectId: e.target.value }))}>
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary btn-sm ml-auto" onClick={exportCSV}>Export CSV ↓</button>
      </div>

      {loading ? <SkeletonTable rows={6} cols={5} /> : data.length === 0 ? (
        <EmptyState icon={LinkIcon} title="No assignments" description="No assignment data for the selected filters." />
      ) : (
        <div className="card overflow-hidden">
          <table className="table-base">
            <thead><tr><th>PM</th><th>Project</th><th>Billable</th><th>From</th><th>To</th><th>Duration</th></tr></thead>
            <tbody>
              {data.map(r => {
                const from = new Date(r.assigned_from + 'T00:00:00');
                const to = new Date(r.effective_to + 'T00:00:00');
                const days = Math.round((to - from) / 86400000);
                return (
                  <tr key={r.id}>
                    <td className="font-medium">{r.pm_name}</td>
                    <td>{r.project_name}</td>
                    <td>{r.billable ? <span className="text-green-600 text-xs">Billable</span> : <span className="text-gray-400 text-xs">Non-billable</span>}</td>
                    <td>{r.assigned_from}</td>
                    <td>{r.assigned_to || <span className="text-green-600 text-xs font-medium">Active</span>}</td>
                    <td className="text-gray-500">{days}d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
