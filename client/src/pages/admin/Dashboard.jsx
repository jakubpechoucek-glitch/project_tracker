import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AppLayout from '../../components/layout/AppLayout';
import SummaryCard from '../../components/ui/SummaryCard';
import BudgetBar from '../../components/ui/BudgetBar';
import { SkeletonCard } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';
import { format } from 'date-fns';

const ClockIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CalIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const CheckIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const AlertIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [budget, setBudget] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const month = format(new Date(), 'yyyy-MM');
    Promise.all([
      api.get('/entries/dashboard/admin'),
      api.get('/reports/budget'),
    ]).then(([dash, bud]) => {
      setData(dash.data.data);
      setBudget(bud.data.data.filter(p => p.status === 'active'));
    }).finally(() => setLoading(false));
  }, []);

  const overBudget = budget.filter(p => p.pct_consumed >= 100).length;

  return (
    <AppLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            [1,2,3,4].map(i => <SkeletonCard key={i} />)
          ) : (
            <>
              <SummaryCard label="Hours this week" value={`${(data?.summary?.thisWeek ?? 0).toFixed(1)}h`} icon={ClockIcon} />
              <SummaryCard label="Hours this month" value={`${(data?.summary?.thisMonth ?? 0).toFixed(1)}h`} icon={CalIcon} />
              <SummaryCard label="Pending approvals" value={data?.summary?.pendingCount ?? 0} icon={CheckIcon}
                accent="bg-amber-50" onClick={() => {}} sub={<Link to="/admin/approvals" className="text-primary text-xs">View all →</Link>} />
              <SummaryCard label="Projects over budget" value={overBudget} icon={AlertIcon} accent="bg-red-50" />
            </>
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
                        <Cell key={i} fill="#E30613" fillOpacity={0.8 - i * 0.1} />
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
