import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import api from '../../../services/api';
import { format, subMonths } from 'date-fns';
import { SkeletonTable } from '../../../components/ui/LoadingSkeleton';
import clsx from 'clsx';

const COLORS = ['#E30613', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];

function toStackedData(byProject) {
  const allActs = [...new Set((byProject || []).flatMap(p => p.activities.map(a => a.activity)))];
  const chartData = (byProject || []).map(p => {
    const row = { project_name: p.project_name.length > 16 ? p.project_name.slice(0, 15) + '…' : p.project_name, _full: p.project_name };
    for (const act of allActs) {
      const found = p.activities.find(a => a.activity === act);
      row[act] = found ? found.total_hours : 0;
    }
    return row;
  });
  return { chartData, allActs };
}

export default function ActivityReport() {
  const [view, setView] = useState('activity'); // 'activity' | 'project'
  const [data, setData] = useState([]);
  const [byProject, setByProject] = useState([]);
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
    Promise.all([
      api.get(`/reports/activity?${params}`),
      api.get(`/reports/activity-by-project?${params}`),
    ]).then(([a, b]) => {
      setData(a.data.data);
      setByProject(b.data.data);
    }).finally(() => setLoading(false));
  }, [filters]);

  const exportCSV = () => {
    const endpoint = view === 'activity' ? '/reports/activity' : '/reports/activity-by-project';
    const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)), export: 'csv' });
    window.open(`/api${endpoint}?${params}`);
  };

  const grandTotal = data.reduce((s, r) => s + r.total_hours, 0);
  const { chartData, allActs } = toStackedData(byProject);

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

      {/* View toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ key: 'activity', label: 'By Activity' }, { key: 'project', label: 'By Project' }].map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className={clsx('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              view === t.key ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BY ACTIVITY ── */}
      {view === 'activity' && (
        <>
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

          {loading ? <SkeletonTable rows={6} cols={6} /> : (
            <div className="card overflow-hidden">
              <table className="table-base">
                <thead>
                  <tr><th>Activity</th><th>Total Hours</th><th>% of Total</th><th>Entries</th><th>PMs</th><th>Projects</th></tr>
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
                      <td>Total</td><td>{grandTotal.toFixed(1)}h</td><td>100%</td><td colSpan={3} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── BY PROJECT ── */}
      {view === 'project' && (
        <>
          {loading ? (
            <div className="card card-body h-64 animate-pulse bg-gray-100 rounded-xl" />
          ) : chartData.length > 0 ? (
            <div className="card card-body">
              <h2 className="mb-4">Activity mix by project</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 40, left: 0 }}>
                  <XAxis dataKey="project_name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} unit="h" />
                  <Tooltip formatter={(v, name) => [`${v}h`, name]} labelFormatter={(label, payload) => payload?.[0]?.payload?._full || label} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  {allActs.map((act, i) => (
                    <Bar key={act} dataKey={act} stackId="a" fill={COLORS[i % COLORS.length]}
                      radius={i === allActs.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          {loading ? <SkeletonTable rows={4} cols={5} /> : (
            <div className="space-y-3">
              {byProject.length === 0 ? (
                <div className="card card-body text-center text-sm text-gray-400">No data for the selected range.</div>
              ) : byProject.map(p => (
                <div key={p.project_id} className="card overflow-hidden">
                  <div className="card-body border-b border-gray-100 flex items-center justify-between py-3">
                    <div>
                      <span className="font-semibold text-gray-800">{p.project_name}</span>
                      <span className="ml-2 text-xs text-gray-400">{p.billable ? '● Billable' : '○ Non-billable'}</span>
                    </div>
                    <span className="font-bold text-gray-700">{p.total_hours}h total</span>
                  </div>
                  <table className="table-base">
                    <thead>
                      <tr><th>Activity</th><th>Hours</th><th>% of Project</th><th>Entries</th></tr>
                    </thead>
                    <tbody>
                      {p.activities.map((a, i) => (
                        <tr key={a.activity}>
                          <td>
                            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            {a.activity}
                          </td>
                          <td className="font-semibold">{a.total_hours}h</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-20">
                                <div className="h-1.5 rounded-full" style={{ width: `${a.pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                              </div>
                              <span className="text-sm text-gray-600">{a.pct}%</span>
                            </div>
                          </td>
                          <td className="text-gray-500">{a.entry_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
