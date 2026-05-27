import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../../services/api';
import { format } from 'date-fns';
import { SkeletonTable } from '../../../components/ui/LoadingSkeleton';

const COLORS = ['#E30613', '#2563EB', '#16A34A', '#D97706', '#7C3AED'];

export default function WorkloadReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ month: format(new Date(), 'yyyy-MM') });
  const [users, setUsers] = useState([]);
  const [trendData, setTrendData] = useState([]);

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data.data.filter(u => u.role === 'pm')));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)));
    api.get(`/reports/workload?${params}`).then(r => {
      setData(r.data.data);
      // Build trend chart data
      const months = {};
      for (const row of r.data.data) {
        for (const t of (row.trend || [])) {
          if (!months[t.month]) months[t.month] = { month: t.month };
          months[t.month][row.pm_name] = t.total_hours;
        }
      }
      setTrendData(Object.values(months).sort((a, b) => a.month.localeCompare(b.month)));
    }).finally(() => setLoading(false));
  }, [filters]);

  const exportCSV = () => {
    const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)), export: 'csv' });
    window.open(`/api/reports/workload?${params}`);
  };

  const pmNames = [...new Set(data.map(d => d.pm_name))];

  return (
    <div className="space-y-4">
      <div className="card card-body flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">Month</label>
          <input type="month" className="input w-40" value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))} />
        </div>
        <button className="btn btn-secondary btn-sm ml-auto" onClick={exportCSV}>Export CSV ↓</button>
      </div>

      {/* Trend chart */}
      {trendData.length > 0 && (
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

      {loading ? <SkeletonTable rows={5} cols={7} /> : (
        <div className="card overflow-hidden">
          <table className="table-base">
            <thead><tr><th>PM</th><th>Month</th><th>Total</th><th>Billable</th><th>Non-Billable</th><th>Days worked</th><th>Avg h/day</th></tr></thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  <td className="font-medium">{r.pm_name}</td>
                  <td>{r.month}</td>
                  <td className="font-semibold">{r.total_hours?.toFixed(1)}h</td>
                  <td className="text-green-600">{r.billable_hours?.toFixed(1)}h</td>
                  <td className="text-gray-500">{r.non_billable_hours?.toFixed(1)}h</td>
                  <td>{r.days_worked}</td>
                  <td className="text-gray-600">{r.avg_hours_day}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
