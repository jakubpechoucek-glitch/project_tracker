import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../../services/api';
import { format, subMonths } from 'date-fns';
import { SkeletonTable } from '../../../components/ui/LoadingSkeleton';

const COLORS = ['#E30613', '#c0050f', '#a0040c', '#800309', '#600207', '#400105', '#200102'];

export default function ActivityReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    pmId: '',
    projectId: '',
  });
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data.data.filter(u => u.role === 'pm')));
    api.get('/projects?includeArchived=true').then(r => setProjects(r.data.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)));
    api.get(`/reports/activity?${params}`).then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, [filters]);

  const exportCSV = () => {
    const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)), export: 'csv' });
    window.open(`/api/reports/activity?${params}`);
  };

  const grandTotal = data.reduce((s, r) => s + r.total_hours, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card card-body flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">From</label>
          <input type="date" className="input w-40" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
        </div>
        <div>
          <label className="label text-xs">To</label>
          <input type="date" className="input w-40" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
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

      {/* Chart */}
      {loading ? (
        <div className="card card-body h-64 animate-pulse bg-gray-100 rounded-xl" />
      ) : data.length > 0 ? (
        <div className="card card-body">
          <h2 className="mb-4">Hours by activity</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 30, left: 0 }}>
              <XAxis dataKey="activity" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} unit="h" />
              <Tooltip formatter={(v, name, props) => [`${v}h (${props.payload.pct}%)`, 'Hours']} />
              <Bar dataKey="total_hours" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.9} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Table */}
      {loading ? <SkeletonTable rows={6} cols={6} /> : (
        <div className="card overflow-hidden">
          <table className="table-base">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Total Hours</th>
                <th>% of Total</th>
                <th>Entries</th>
                <th>PMs</th>
                <th>Projects</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  <td className="font-medium">
                    <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {r.activity}
                  </td>
                  <td className="font-semibold">{r.total_hours.toFixed(1)}h</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-24">
                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
                      </div>
                      <span className="text-sm text-gray-600">{r.pct}%</span>
                    </div>
                  </td>
                  <td className="text-gray-600">{r.entry_count}</td>
                  <td className="text-gray-600">{r.pm_count}</td>
                  <td className="text-gray-600">{r.project_count}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No data for the selected range.</td></tr>
              )}
              {data.length > 0 && (
                <tr className="bg-gray-50 font-semibold">
                  <td>Total</td>
                  <td>{grandTotal.toFixed(1)}h</td>
                  <td>100%</td>
                  <td colSpan={3} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
