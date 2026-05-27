import { useEffect, useState } from 'react';
import api from '../../../services/api';
import { format, subMonths } from 'date-fns';
import { SkeletonTable } from '../../../components/ui/LoadingSkeleton';
import clsx from 'clsx';

export default function ApprovalReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    pmId: '',
  });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data.data.filter(u => u.role === 'pm')));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)));
    api.get(`/reports/approval?${params}`).then(r => setData(r.data.data)).finally(() => setLoading(false));
  }, [filters]);

  const exportCSV = () => {
    const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)), export: 'csv' });
    window.open(`/api/reports/approval?${params}`);
  };

  return (
    <div className="space-y-4">
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
        <button className="btn btn-secondary btn-sm ml-auto" onClick={exportCSV}>Export CSV ↓</button>
      </div>

      {loading ? <SkeletonTable rows={5} cols={6} /> : (
        <div className="card overflow-hidden">
          <table className="table-base">
            <thead><tr><th>PM</th><th>Submitted</th><th>Approved</th><th>Rejected</th><th>Pending</th><th>Approval Rate</th></tr></thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  <td className="font-medium">{r.pm_name}</td>
                  <td>{r.submitted_hours?.toFixed(1)}h</td>
                  <td className="text-green-600">{r.approved_hours?.toFixed(1)}h</td>
                  <td className="text-red-600">{r.rejected_hours?.toFixed(1)}h</td>
                  <td className="text-amber-600">{r.pending_hours?.toFixed(1)}h</td>
                  <td>
                    <span className={clsx('font-bold', r.approval_rate >= 90 ? 'text-green-600' : r.approval_rate >= 70 ? 'text-amber-600' : 'text-red-600')}>
                      {r.approval_rate != null ? `${r.approval_rate}%` : '—'}
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No data for the selected range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
