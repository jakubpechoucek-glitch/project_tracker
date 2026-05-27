import { useEffect, useState } from 'react';
import api from '../../../services/api';
import { format } from 'date-fns';
import { SkeletonTable } from '../../../components/ui/LoadingSkeleton';
import EmptyState from '../../../components/ui/EmptyState';

const ChartIcon = () => <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;

export default function MonthlySummary() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ month: format(new Date(), 'yyyy-MM'), pmId: '', projectId: '' });
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data.data.filter(u => u.role === 'pm')));
    api.get('/projects?includeArchived=true').then(r => setProjects(r.data.data));
  }, []);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)));
      const res = await api.get(`/reports/monthly?${params}`);
      setData(res.data.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filters]);

  function exportCSV() {
    const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)), export: 'csv' });
    window.open(`/api/reports/monthly?${params}`);
  }

  return (
    <div className="space-y-4">
      <div className="card card-body flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">Month</label>
          <input type="month" className="input w-40" value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))} />
        </div>
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

      {loading ? <SkeletonTable rows={6} cols={7} /> : data.length === 0 ? (
        <EmptyState icon={ChartIcon} title="No data" description="No approved or pending hours found for the selected filters." />
      ) : (
        <div className="card overflow-hidden">
          <table className="table-base">
            <thead><tr><th>Month</th><th>PM</th><th>Project</th><th>Total</th><th>Billable</th><th>Non-Billable</th><th>Prev Month</th></tr></thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  <td className="font-medium">{r.month}</td>
                  <td>{r.pm_name}</td>
                  <td>{r.project_name}</td>
                  <td className="font-semibold">{r.total_hours?.toFixed(1)}h</td>
                  <td className="text-green-600">{r.billable_hours?.toFixed(1)}h</td>
                  <td className="text-gray-500">{r.non_billable_hours?.toFixed(1)}h</td>
                  <td className="text-gray-400">{r.prev_month_hours > 0 ? `${r.prev_month_hours?.toFixed(1)}h` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
