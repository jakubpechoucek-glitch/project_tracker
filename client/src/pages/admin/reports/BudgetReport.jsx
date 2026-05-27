import { useEffect, useState } from 'react';
import api from '../../../services/api';
import BudgetBar from '../../../components/ui/BudgetBar';
import StatusBadge from '../../../components/ui/StatusBadge';
import { SkeletonTable } from '../../../components/ui/LoadingSkeleton';
import clsx from 'clsx';

export default function BudgetReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/budget').then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, []);

  const exportCSV = () => window.open('/api/reports/budget?export=csv');

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn btn-secondary btn-sm" onClick={exportCSV}>Export CSV ↓</button>
      </div>
      {loading ? <SkeletonTable rows={5} cols={7} /> : (
        <div className="card overflow-hidden">
          <table className="table-base">
            <thead><tr><th>Project</th><th>Status</th><th>Budget</th><th>Logged</th><th>Progress</th><th>Remaining</th><th>Burn rate</th><th>Forecast</th></tr></thead>
            <tbody>
              {data.map(r => (
                <tr key={r.project_id}>
                  <td>
                    <span className="font-medium">{r.project_name}</span>
                    {r.billable && <span className="ml-2 text-xs text-green-600">Billable</span>}
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.budget_hours}h</td>
                  <td>{r.hours_logged.toFixed(1)}h</td>
                  <td className="min-w-[160px]"><BudgetBar logged={r.hours_logged} budget={r.budget_hours} /></td>
                  <td className={clsx('font-medium', r.hours_remaining <= 0 ? 'text-red-600' : r.pct_consumed >= 75 ? 'text-amber-600' : 'text-green-600')}>
                    {r.hours_remaining.toFixed(1)}h
                  </td>
                  <td className="text-gray-500">{r.burn_rate_per_day > 0 ? `${r.burn_rate_per_day.toFixed(2)}h/day` : '—'}</td>
                  <td className="text-gray-500 text-sm">{r.forecast_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
