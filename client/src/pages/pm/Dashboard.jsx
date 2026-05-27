import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import SummaryCard from '../../components/ui/SummaryCard';
import BudgetBar from '../../components/ui/BudgetBar';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonCard } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';

const ClockIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CalIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

export default function PMDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weekEntries, setWeekEntries] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/entries/dashboard/pm'),
      api.get('/entries/week'),
    ]).then(([dash, week]) => {
      setData(dash.data.data);
      setWeekEntries(week.data.data.entries || []);
    }).finally(() => setLoading(false));
  }, []);

  const weekStatus = () => {
    if (!weekEntries.length) return null;
    const statuses = [...new Set(weekEntries.map(e => e.status))];
    if (statuses.every(s => s === 'approved')) return 'approved';
    if (statuses.some(s => s === 'rejected')) return 'rejected';
    if (statuses.some(s => s === 'pending')) return 'pending';
    return 'draft';
  };

  return (
    <AppLayout title="My Dashboard">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loading ? (
            <><SkeletonCard /><SkeletonCard /></>
          ) : (
            <>
              <SummaryCard label="Hours this week" value={`${(data?.summary?.thisWeek ?? 0).toFixed(1)}h`} icon={ClockIcon} />
              <SummaryCard label="Hours this month" value={`${(data?.summary?.thisMonth ?? 0).toFixed(1)}h`} icon={CalIcon} />
            </>
          )}
        </div>

        {/* Week status */}
        <div className="card card-body">
          <div className="flex items-center justify-between mb-4">
            <h2>This week's timesheet</h2>
            {weekStatus() && <StatusBadge status={weekStatus()} />}
          </div>
          {weekEntries.length === 0 ? (
            <p className="text-sm text-gray-400">No entries logged this week yet.</p>
          ) : (
            <p className="text-sm text-gray-600">{weekEntries.length} entr{weekEntries.length === 1 ? 'y' : 'ies'} logged this week.</p>
          )}
          <Link to="/timesheet" className="btn-primary btn-sm mt-4 inline-flex">Go to Timesheet →</Link>
        </div>

        {/* Active projects */}
        <div className="card">
          <div className="card-body border-b border-gray-100 flex items-center justify-between">
            <h2>My active projects</h2>
          </div>
          {loading ? (
            <div className="p-6 space-y-4">{[1, 2].map(i => <SkeletonCard key={i} />)}</div>
          ) : data?.activeProjects?.length === 0 ? (
            <div className="p-6 text-sm text-gray-400 text-center">No active project assignments.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data?.activeProjects?.map(p => {
                const logged = p.total_hours || 0;
                const pct = p.budget_hours > 0 ? (logged / p.budget_hours) * 100 : 0;
                return (
                  <div key={p.id} className="px-6 py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 text-sm">{p.project_name}</span>
                      <StatusBadge status={p.project_status} />
                    </div>
                    <BudgetBar logged={logged} budget={p.budget_hours} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
