import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { format, addDays, subDays, startOfISOWeek, isAfter, startOfDay } from 'date-fns';
import AppLayout from '../../components/layout/AppLayout';
import SummaryCard from '../../components/ui/SummaryCard';
import BudgetBar from '../../components/ui/BudgetBar';
import { SkeletonCard } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';

const ACT_COLORS = ['#E30613', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];

function toStackedData(byProject) {
  const allActs = [...new Set((byProject || []).flatMap(p => p.activities.map(a => a.activity)))];
  const chartData = (byProject || []).map(p => {
    const row = { project_name: p.project_name.length > 14 ? p.project_name.slice(0, 13) + '…' : p.project_name, _full: p.project_name };
    for (const act of allActs) {
      const found = p.activities.find(a => a.activity === act);
      row[act] = found ? found.total_hours : 0;
    }
    return row;
  });
  return { chartData, allActs };
}

function weekLabel(monday) {
  const sunday = addDays(monday, 6);
  if (format(monday, 'MMM') === format(sunday, 'MMM')) {
    return `${format(monday, 'MMM d')} – ${format(sunday, 'd, yyyy')}`;
  }
  return `${format(monday, 'MMM d')} – ${format(sunday, 'MMM d, yyyy')}`;
}

const ClockIcon  = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CalIcon    = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const CheckIcon  = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const AlertIcon  = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;

export default function AdminDashboard() {
  const today = startOfISOWeek(new Date());
  const [selectedMonday, setSelectedMonday] = useState(today);
  const isCurrent = format(selectedMonday, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

  const [data, setData] = useState(null);
  const [budget, setBudget] = useState([]);
  const [pmSummaries, setPmSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  const weekStartStr = format(selectedMonday, 'yyyy-MM-dd');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/entries/dashboard/admin?weekStart=${weekStartStr}`),
      api.get('/reports/budget'),
      api.get(`/weekly-summaries?weekStart=${weekStartStr}`),
    ]).then(([dash, bud, sums]) => {
      setData(dash.data.data);
      setBudget(bud.data.data.filter(p => p.status === 'active'));
      setPmSummaries(sums.data.data);
    }).finally(() => setLoading(false));
  }, [weekStartStr]);

  useEffect(() => { load(); }, [load]);

  const overBudget = budget.filter(p => p.pct_consumed >= 100).length;
  const { chartData, allActs } = toStackedData(data?.activityByProject);

  return (
    <AppLayout title="Admin Dashboard">
      <div className="space-y-6">

        {/* Week picker */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedMonday(m => subDays(m, 7))}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600">‹</button>
            <span className="text-sm font-medium text-gray-700 min-w-52 text-center">{weekLabel(selectedMonday)}</span>
            <button onClick={() => setSelectedMonday(m => addDays(m, 7))}
              disabled={isCurrent}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">›</button>
          </div>
          {!isCurrent && (
            <button onClick={() => setSelectedMonday(today)} className="text-xs text-primary hover:underline">Back to current week</button>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            [1,2,3,4].map(i => <SkeletonCard key={i} />)
          ) : (
            <>
              <SummaryCard label="Hours this week" value={`${(data?.summary?.thisWeek ?? 0).toFixed(1)}h`} icon={ClockIcon} />
              <SummaryCard label="Hours this month" value={`${(data?.summary?.thisMonth ?? 0).toFixed(1)}h`} icon={CalIcon} />
              <SummaryCard label="Pending approvals" value={data?.summary?.pendingCount ?? 0} icon={CheckIcon}
                accent="bg-amber-50" sub={<Link to="/admin/approvals" className="text-primary text-xs">View all →</Link>} />
              <SummaryCard label="Projects over budget" value={overBudget} icon={AlertIcon} accent="bg-red-50" />
            </>
          )}
        </div>

        {/* PM Weekly Summaries */}
        <div className="card">
          <div className="card-body border-b border-gray-100">
            <h2>PM weekly summaries — {weekLabel(selectedMonday)}</h2>
          </div>
          {loading ? <div className="p-6"><SkeletonCard /></div> : (
            pmSummaries.length === 0 ? (
              <div className="p-6 text-sm text-gray-400 text-center">No summaries submitted for this week yet.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pmSummaries.map(s => (
                  <div key={s.id} className="px-6 py-4 space-y-3">
                    <p className="font-semibold text-gray-800 text-sm">{s.pm_name}</p>
                    {s.highlights && (
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">✅ Highlights</p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{s.highlights}</p>
                      </div>
                    )}
                    {s.blockers && (
                      <div>
                        <p className="text-xs font-medium text-amber-700 mb-1">🚧 Blockers</p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{s.blockers}</p>
                      </div>
                    )}
                    {!s.highlights && !s.blockers && (
                      <p className="text-xs text-gray-400 italic">No content written.</p>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hours per project bar chart */}
          <div className="card card-body">
            <h2 className="mb-4">Hours by project (this month)</h2>
            {loading ? <div className="h-48 bg-gray-100 rounded animate-pulse" /> : (
              data?.hoursPerProject?.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No hours logged this month.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data?.hoursPerProject} margin={{ top: 5, right: 5, bottom: 30, left: 0 }}>
                    <XAxis dataKey="project_name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v}h`, 'Hours']} />
                    <Bar dataKey="total_hours" radius={[4, 4, 0, 0]}>
                      {data?.hoursPerProject?.map((_, i) => (
                        <Cell key={i} fill="#E30613" fillOpacity={0.8 - i * 0.08} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            )}
          </div>

          {/* Budget consumption */}
          <div className="card">
            <div className="card-body border-b border-gray-100">
              <h2>Budget consumption</h2>
            </div>
            {loading ? <div className="p-6 space-y-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div> : (
              <div className="divide-y divide-gray-100">
                {budget.length === 0 ? (
                  <div className="p-6 text-sm text-gray-400 text-center">No active projects.</div>
                ) : budget.map(p => (
                  <div key={p.project_id} className="px-6 py-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-800">{p.project_name}</span>
                      {p.pct_consumed >= 100 && <span className="text-xs text-red-600 font-semibold">OVER BUDGET</span>}
                      {p.pct_consumed >= 75 && p.pct_consumed < 100 && <span className="text-xs text-amber-600 font-semibold">⚠ {p.pct_consumed.toFixed(0)}%</span>}
                    </div>
                    <BudgetBar logged={p.hours_logged} budget={p.budget_hours} forecast={p.forecast_date} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity breakdown by project (this month) */}
        <div className="card card-body">
          <h2 className="mb-4">Activity breakdown by project (this month)</h2>
          {loading ? <div className="h-48 bg-gray-100 rounded animate-pulse" /> : (
            !chartData.length ? (
              <p className="text-sm text-gray-400 py-8 text-center">No hours logged this month.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 35, left: 0 }}>
                  <XAxis dataKey="project_name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} unit="h" />
                  <Tooltip formatter={(v, name) => [`${v}h`, name]} labelFormatter={(label, payload) => payload?.[0]?.payload?._full || label} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {allActs.map((act, i) => (
                    <Bar key={act} dataKey={act} stackId="a" fill={ACT_COLORS[i % ACT_COLORS.length]} radius={i === allActs.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )
          )}
        </div>

        {/* Active assignments */}
        <div className="card">
          <div className="card-body border-b border-gray-100">
            <h2>Active assignments</h2>
          </div>
          {loading ? <div className="p-6"><SkeletonCard /></div> : (
            <table className="table-base">
              <thead><tr><th>PM</th><th>Project</th><th>Since</th></tr></thead>
              <tbody>
                {data?.activeAssignments?.length === 0 ? (
                  <tr><td colSpan={3} className="py-6 text-center text-gray-400 text-sm">No active assignments</td></tr>
                ) : data?.activeAssignments?.map(a => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.pm_name}</td>
                    <td>{a.project_name}</td>
                    <td className="text-gray-500">{a.assigned_from}</td>
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
