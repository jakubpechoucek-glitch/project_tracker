import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, addDays, subDays, startOfISOWeek } from 'date-fns';
import AppLayout from '../../components/layout/AppLayout';
import SummaryCard from '../../components/ui/SummaryCard';
import BudgetBar from '../../components/ui/BudgetBar';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonCard } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ACTIVITY_COLORS = ['#E30613', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];

const ClockIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CalIcon   = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ChevronL  = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const ChevronR  = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;

function weekLabel(monday) {
  const sunday = addDays(monday, 6);
  if (format(monday, 'MMM') === format(sunday, 'MMM')) {
    return `${format(monday, 'MMM d')} – ${format(sunday, 'd, yyyy')}`;
  }
  return `${format(monday, 'MMM d')} – ${format(sunday, 'MMM d, yyyy')}`;
}

function ActivityMiniBar({ activities }) {
  if (!activities?.length) return <p className="text-xs text-gray-400">No activity data this week</p>;
  return (
    <div className="space-y-1 mt-2">
      {activities.map((a, i) => (
        <div key={a.activity} className="flex items-center gap-2 text-xs">
          <div className="w-24 shrink-0 text-gray-500 truncate">{a.activity}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full" style={{ width: `${a.pct}%`, backgroundColor: ACTIVITY_COLORS[i % ACTIVITY_COLORS.length] }} />
          </div>
          <div className="w-10 text-right text-gray-600">{a.total_hours}h</div>
          <div className="w-8 text-right text-gray-400">{a.pct}%</div>
        </div>
      ))}
    </div>
  );
}

export default function PMDashboard() {
  const currentMonday = format(startOfISOWeek(new Date()), 'yyyy-MM-dd');
  const [weekStart, setWeekStart] = useState(currentMonday);
  const isCurrent = weekStart === currentMonday;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weekEntries, setWeekEntries] = useState([]);
  const [summary, setSummary] = useState({ highlights: '', blockers: '' });
  const [summaryDirty, setSummaryDirty] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/entries/dashboard/pm?weekStart=${weekStart}`),
      api.get(`/entries/week?week=${weekStart}`),
      api.get(`/weekly-summaries?weekStart=${weekStart}`),
    ]).then(([dash, week, sum]) => {
      setData(dash.data.data);
      setWeekEntries(week.data.data.entries || []);
      const s = sum.data.data;
      setSummary({ highlights: s?.highlights || '', blockers: s?.blockers || '' });
      setSummaryDirty(false);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [weekStart]);

  function prevWeek() { setWeekStart(w => format(subDays(new Date(w + 'T00:00:00'), 7), 'yyyy-MM-dd')); }
  function nextWeek() { setWeekStart(w => format(addDays(new Date(w + 'T00:00:00'), 7), 'yyyy-MM-dd')); }

  async function saveSummary() {
    setSavingSummary(true);
    try {
      await api.put(`/weekly-summaries?weekStart=${weekStart}`, summary);
      toast.success('Summary saved');
      setSummaryDirty(false);
    } catch { toast.error('Failed to save'); }
    finally { setSavingSummary(false); }
  }

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

        {/* Week picker */}
        <div className="card card-body py-3">
          <div className="flex items-center justify-between">
            <button onClick={prevWeek}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-medium transition-colors">
              <ChevronL /> Previous week
            </button>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Week</p>
              <p className="text-sm font-semibold text-gray-800">{weekLabel(new Date(weekStart + 'T00:00:00'))}</p>
            </div>
            <button onClick={nextWeek} disabled={isCurrent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              Next week <ChevronR />
            </button>
          </div>
          {!isCurrent && (
            <div className="text-center mt-2">
              <button onClick={() => setWeekStart(currentMonday)}
                className="text-xs text-primary hover:underline">↩ Back to current week</button>
            </div>
          )}
        </div>

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

        {/* Week status + timesheet link */}
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
          {isCurrent && <Link to="/timesheet" className="btn-primary btn-sm mt-4 inline-flex">Go to Timesheet →</Link>}
        </div>

        {/* Weekly summary */}
        <div className="card card-body space-y-4">
          <div className="flex items-center justify-between">
            <h2>Weekly summary</h2>
            {summaryDirty && (
              <button onClick={saveSummary} disabled={savingSummary}
                className="btn-primary btn-sm">{savingSummary ? 'Saving…' : 'Save'}</button>
            )}
          </div>
          <div>
            <label className="label text-xs">✅ Highlights — what went well</label>
            <textarea className="input resize-none w-full" rows={3}
              placeholder="e.g. Finished onboarding docs, kicked off Project Beta meetings…"
              value={summary.highlights}
              onChange={e => { setSummary(s => ({ ...s, highlights: e.target.value })); setSummaryDirty(true); }} />
          </div>
          <div>
            <label className="label text-xs">🚧 Blockers — what's in the way</label>
            <textarea className="input resize-none w-full" rows={3}
              placeholder="e.g. Waiting on client sign-off, missing data access for reporting…"
              value={summary.blockers}
              onChange={e => { setSummary(s => ({ ...s, blockers: e.target.value })); setSummaryDirty(true); }} />
          </div>
          {summaryDirty && <p className="text-xs text-gray-400">Unsaved changes</p>}
        </div>

        {/* Activity breakdown */}
        <div className="card card-body">
          <h2 className="mb-4">Hours by activity (this week)</h2>
          {loading ? <div className="h-40 bg-gray-100 rounded animate-pulse" /> : (
            !data?.activityBreakdown?.length ? (
              <p className="text-sm text-gray-400 py-6 text-center">No hours logged this week yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.activityBreakdown} margin={{ top: 5, right: 5, bottom: 30, left: 0 }}>
                  <XAxis dataKey="activity" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} unit="h" />
                  <Tooltip formatter={(v) => [`${v}h`, 'Hours']} />
                  <Bar dataKey="total_hours" radius={[4, 4, 0, 0]}>
                    {data.activityBreakdown.map((_, i) => (
                      <Cell key={i} fill={ACTIVITY_COLORS[i % ACTIVITY_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          )}
        </div>

        {/* Active projects with per-project activity breakdown */}
        <div className="card">
          <div className="card-body border-b border-gray-100">
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
                const projectBreakdown = data?.activityByProject?.find(x => x.project_id === p.id);
                return (
                  <div key={p.id} className="px-6 py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 text-sm">{p.project_name}</span>
                      <StatusBadge status={p.project_status} />
                    </div>
                    <BudgetBar logged={logged} budget={p.budget_hours} />
                    {projectBreakdown && (
                      <details className="group">
                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none list-none flex items-center gap-1 mt-1">
                          <span className="group-open:hidden">▸</span>
                          <span className="hidden group-open:inline">▾</span>
                          Activity breakdown this week
                        </summary>
                        <ActivityMiniBar activities={projectBreakdown.activities} />
                      </details>
                    )}
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
