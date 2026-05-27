import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../../services/api';
import { format, startOfISOWeek, endOfISOWeek, startOfMonth, endOfMonth } from 'date-fns';
import { SkeletonTable } from '../../../components/ui/LoadingSkeleton';
import EmptyState from '../../../components/ui/EmptyState';

const ChartIcon = () => <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const COLORS = ['#E30613', '#2563EB', '#16A34A', '#D97706', '#7C3AED', '#0891B2', '#DB2777'];

const GRAN = [
  { value: 'month', label: 'Monthly' },
  { value: 'week',  label: 'Weekly' },
  { value: 'day',   label: 'Daily' },
];

export default function WorkloadReport() {
  const [granularity, setGranularity] = useState('month');
  const [month,    setMonth]    = useState(format(new Date(), 'yyyy-MM'));
  const [dateFrom, setDateFrom] = useState(format(startOfISOWeek(new Date()), 'yyyy-MM-dd'));
  const [dateTo,   setDateTo]   = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pmId,     setPmId]     = useState('');
  const [data,     setData]     = useState([]);
  const [trendData,setTrendData]= useState([]);
  const [loading,  setLoading]  = useState(true);
  const [users,    setUsers]    = useState([]);

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data.data.filter(u => u.role === 'pm')));
  }, []);

  // When switching granularity set sensible defaults for date inputs
  function handleGranChange(g) {
    setGranularity(g);
    if (g === 'week') {
      setDateFrom(format(startOfISOWeek(new Date()), 'yyyy-MM-dd'));
      setDateTo(format(endOfISOWeek(new Date()), 'yyyy-MM-dd'));
    } else if (g === 'day') {
      setDateFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
      setDateTo(format(new Date(), 'yyyy-MM-dd'));
    }
  }

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ granularity });
    if (granularity === 'month' && month) params.set('month', month);
    if (granularity !== 'month' && dateFrom) params.set('dateFrom', dateFrom);
    if (granularity !== 'month' && dateTo)   params.set('dateTo', dateTo);
    if (pmId) params.set('pmId', pmId);

    api.get(`/reports/workload?${params}`).then(r => {
      setData(r.data.data);
      if (granularity === 'month') {
        const months = {};
        for (const row of r.data.data) {
          for (const t of (row.trend || [])) {
            if (!months[t.month]) months[t.month] = { month: t.month };
            months[t.month][row.pm_name] = t.total_hours;
          }
        }
        setTrendData(Object.values(months).sort((a, b) => a.month.localeCompare(b.month)));
      } else {
        setTrendData([]);
      }
    }).finally(() => setLoading(false));
  }, [granularity, month, dateFrom, dateTo, pmId]);

  function exportCSV() {
    const params = new URLSearchParams({ granularity, export: 'csv' });
    if (granularity === 'month' && month) params.set('month', month);
    if (granularity !== 'month' && dateFrom) params.set('dateFrom', dateFrom);
    if (granularity !== 'month' && dateTo)   params.set('dateTo', dateTo);
    if (pmId) params.set('pmId', pmId);
    window.open(`/api/reports/workload?${params}`);
  }

  const pmNames = [...new Set(data.map(d => d.pm_name))];
  const periodLabel = granularity === 'week' ? 'Week' : granularity === 'day' ? 'Date' : 'Month';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card card-body flex flex-wrap gap-3 items-end">
        {/* Granularity toggle */}
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

        {/* Date picker — month or range */}
        {granularity === 'month' ? (
          <div>
            <label className="label text-xs">Month</label>
            <input type="month" className="input w-40" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
        ) : (
          <>
            <div>
              <label className="label text-xs">From</label>
              <input type="date" className="input w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">To</label>
              <input type="date" className="input w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </>
        )}

        <div>
          <label className="label text-xs">PM</label>
          <select className="input w-40" value={pmId} onChange={e => setPmId(e.target.value)}>
            <option value="">All PMs</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <button className="btn btn-secondary btn-sm ml-auto" onClick={exportCSV}>Export CSV ↓</button>
      </div>

      {/* 6-month trend chart — month view only */}
      {granularity === 'month' && trendData.length > 0 && (
        <div className="card card-body">
          <h3 className="mb-4">6-month trend (hours)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {pmNames.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      {loading ? <SkeletonTable rows={5} cols={7} /> : data.length === 0 ? (
        <EmptyState icon={ChartIcon} title="No data" description="No hours found for the selected filters." />
      ) : (
        <div className="card overflow-hidden">
          <table className="table-base">
            <thead>
              <tr>
                <th>PM</th>
                <th>{periodLabel}</th>
                <th>Total</th>
                <th>Billable</th>
                <th>Non-Billable</th>
                <th>Days worked</th>
                <th>Avg h/day</th>
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
      )}
    </div>
  );
}
