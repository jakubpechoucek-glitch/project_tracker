import { useEffect, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const ListIcon = () => <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;

export default function MyEntries() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filters, setFilters] = useState({ status: '', dateFrom: '', dateTo: '' });

  async function load(p = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pmId: user.id, page: p, pageSize: 20 });
      if (filters.status) params.set('status', filters.status);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      const res = await api.get(`/entries?${params}`);
      setData(res.data.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page, filters]);

  async function handleDelete() {
    try {
      await api.delete(`/entries/${deleteTarget.id}`);
      toast.success('Entry deleted');
      setDeleteTarget(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  }

  return (
    <AppLayout title="My Entries">
      <div className="space-y-4">
        {/* Filters */}
        <div className="card card-body">
          <div className="flex flex-wrap gap-3">
            <select className="input w-40" value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
              <option value="">All statuses</option>
              {['draft', 'pending', 'approved', 'rejected'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <input type="date" className="input w-40" value={filters.dateFrom} onChange={e => { setFilters(f => ({ ...f, dateFrom: e.target.value })); setPage(1); }} />
            <input type="date" className="input w-40" value={filters.dateTo} onChange={e => { setFilters(f => ({ ...f, dateTo: e.target.value })); setPage(1); }} />
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ status: '', dateFrom: '', dateTo: '' }); setPage(1); }}>Clear</button>
          </div>
        </div>

        {/* Table */}
        {loading ? <SkeletonTable rows={5} cols={6} /> : (
          <div className="card overflow-hidden">
            {data?.rows?.length === 0 ? (
              <EmptyState icon={ListIcon} title="No entries found" description="Start logging time from the Timesheet view." />
            ) : (
              <>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>Hours</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Rejection reason</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.rows?.map(e => (
                      <tr key={e.id}>
                        <td className="font-medium">{e.date}</td>
                        <td>{e.project_name}</td>
                        <td>{e.hours}h</td>
                        <td className="text-gray-500">{e.category}</td>
                        <td><StatusBadge status={e.status} /></td>
                        <td className="text-xs text-red-600 max-w-xs truncate">{e.rejection_reason || '—'}</td>
                        <td>
                          {e.status === 'draft' && (
                            <button className="btn btn-ghost btn-sm text-red-500 hover:text-red-700" onClick={() => setDeleteTarget(e)}>Delete</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination page={page} totalPages={data?.totalPages} onPage={p => { setPage(p); load(p); }} />
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete entry?"
        message={`Delete ${deleteTarget?.hours}h entry on ${deleteTarget?.date} for ${deleteTarget?.project_name}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmClass="btn-danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
