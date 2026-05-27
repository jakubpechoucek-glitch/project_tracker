import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import api from '../../../services/api';
import { format, subMonths, subWeeks, subDays, startOfMonth, endOfMonth, startOfISOWeek, endOfISOWeek } from 'date-fns';
import { SkeletonTable } from '../../../components/ui/LoadingSkeleton';
import EmptyState from '../../../components/ui/EmptyState';

const ChartIcon = () => <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;

const COLORS = ['#E30613', '#2563EB', '#16A34A', '#D97706', '#7C3AED', '#0891B2', '#DB2777'];

const GRAN = [
  { value: 'month', label: 'Monthly' },
  { value: 'week',  label: 'Weekly'  },
  { value: 'day',   label: 'Daily'   },
];

// Default date ranges per granularity
function defaultRange(g) {
  const now = new Date();
  if (g === 'month') return {
    dateFrom: format(subMonths(startOfMonth(now), 5), 'yyyy-MM-dd'),
    dateTo:   format(endOfMonth(now), 'yyyy-MM-dd'),
  };
  if (g === 'week') return {
    dateFrom: format(startOfISOWeek(subWeeks(now, 7)), 'yyyy-MM-dd'),
    dateTo:   format(endOfISOWeek(now), 'yyyy-MM-dd'),
  };
  // day
  return {
    dateFrom: format(subDays(now, 29), 'yyyy-MM-dd'),
    dateTo:   format(now, 'yyyy-MM-dd'),
  };
}

export default function WorkloadReport() {
  const [granularity, setGranularity] = useState('month');
  const [range, setRange] = useState(defaultRange('month'));
  const [pmId, setPmId] = useState('');
  const [data, setData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data.data.filter(u => u.role === 'pm')));
  }, []);

  function handleGranChange(g) {
    setGranularity(g);
    setRange(defaultRange(g));
  }

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ granularity, dateFrom: range.dateFrom, dateTo: range.dateTo });
    if (pmId) params.set('pmId', pmId);

    api.get(`/reports/workload?${params}`).then(r => {
      const rows = r.data.data;
      setData(rows);

      // Build chart data: [{ period, PM1: hours, PM2: hours, ... }]
      const byPeriod = {};
      for (const row of rows) {
        if (!byPeriod[row.period]) byPeriod[row.period] = { period: row.period };
        byPeriod[row.period][row.pm_name] = row.total_hours;
      }
      setChartData(Object.values(byPeriod).sort((a, b) => a.period.localeCompare(b.period)));
    }).finally(() => setLoading(false));
  }, [granularity, range, pmId]);

  function exportCSV() {
    const params = new URLSearchParams({ granularity, dateFrom: range.dateFrom, dateTo: range.dateTo, export: 'csv' });
    if (pmId) params.set('pmId', pmId);
    window.open(`/api/reports/workload?${params}`);
  }

  const pmNames = [...new Set(data.map(d => d.pm_name))];
  const periodLabel = granularity === 'week' ? 'Week' : granularity === 'day' ? 'Date' : 'Month';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card card-body flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">View</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {GRAN.map(g => (
              <button key={g.value} onClick={() => handleGranChange(g.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${granularity === g.value ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label text-xs">From</label>
          <input type="date" className="input w-40" value={range.dateFrom} onChange={e => setRange(r => ({ ...r, dateFrom: e.target.value }))} />
        </div>
        <div>
          <label className="label text-xs">To</label>
          <input type="date" className="input w-40" value={range.dateTo} onChange={e => setRange(r => ({ ...r, dateTo: e.target.value }))} />
        </div>
        <div>
          <label className="label text-xs">PM</label>
          <select className="input w-40" value={pmId} onChange={e => setPmId(e.target.value)}>
            <option value="">All PMs</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary btn-sm ml-auto" onClick={exportCSV}>Export CSV ↓</button>
      </div>

      {loading ? (
        <div className="card card-body h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400 text-sm">Loading chart…</div>
        </div>
      ) : chartData.length === 0 ? (
        <EmptyState icon={ChartIcon} title="No data" description="No hours found for the selected range." />
      ) : (
        <>
          {/* Chart */}
          <div className="card card-body">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Hours by PM — {periodLabel} view
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: granularity === 'day' ? 40 : 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11 }}
                  angle={granularity === 'day' ? -45 : 0}
                  textAnchor={granularity === 'day' ? 'end' : 'middle'}
                  interval={granularity === 'day' ? 2 : 0}
                />
                <YAxis tick={{ fontSize: 11 }} unit="h" />
                <Tooltip formatter={(v) => `${v}h`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {pmNames.map((name, i) => (
                  <Bar key={name} dataKey={name} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={40} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail table */}
          <div className="card overflow-hidden">
            <table className="table-base">
              <thead>
                <tr>
                  <th>PM</th><th>{periodLabel}</th><th>Total</th><th>Billable</th>
                  <th>Non-Billable</th><th>Days worked</th><th>Avg h/day</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={i}>
                    <td className="font-medium">{r.pm_name}</td>
                    <td>{r.period}</td>
                    <td className="font-semibold">{r.total_hours?.toFixed(1)}h</td>
                    <td className="text-green-600">{r.billable_hours?.toFixed(1)}h</td>
                    <td className="text-gray-500">{r.non_billable_hours?.toFixed(1)}h</td>
                    <td>{granularity === 'day' ? '—' : r.days_worked}</td>
                    <td className="text-gray-600">{granularity === 'day' ? `${r.total_hours?.toFixed(1)}h` : `${r.avg_hours_day}h`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
