import { useEffect, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ListIcon = () => <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
const CATEGORIES = ['Planning', 'Meetings', 'Reporting', 'Problem Solving', 'Documentation', 'Other'];

export default function AllEntries() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ pmId: '', projectId: '', status: '', category: '', dateFrom: '', dateTo: '' });
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    api.get('/users?includeInactive=true').then(r => setUsers(r.data.data));
    api.get('/projects?includeArchived=true').then(r => setProjects(r.data.data));
  }, []);

  async function load(p = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, pageSize: 20, ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)) });
      const res = await api.get(`/entries?${params}`);
      setData(res.data.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page, filters]);

  const setFilter = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };

  async function approve(id) {
    try { await api.post(`/entries/${id}/approve`); toast.success('Approved'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function handleReject() {
    try {
      await api.post(`/entries/${rejectDialog.id}/reject`, { reason: rejectReason });
      toast.success('Rejected');
      setRejectDialog(null);
      setRejectReason('');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function reopen(id) {
    try { await api.post(`/entries/${id}/reopen`); toast.success('Entry reopened to draft'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  return (
    <AppLayout title="All Time Entries">
      <div className="space-y-4">
        <div className="card card-body">
          <div className="flex flex-wrap gap-3">
            <select className="input w-40" value={filters.pmId} onChange={e => setFilter('pmId', e.target.value)}>
              <option value="">All PMs</option>
              {users.filter(u => u.role === 'pm').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select className="input w-48" value={filters.projectId} onChange={e => setFilter('projectId', e.target.value)}>
              <option value="">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="input w-36" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              <option value="">All statuses</option>
              {['draft', 'pending', 'approved', 'rejected'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input w-40" value={filters.category} onChange={e => setFilter('category', e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" className="input w-40" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)} />
            <input type="date" className="input w-40" value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)} />
            <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ pmId: '', projectId: '', status: '', category: '', dateFrom: '', dateTo: '' }); setPage(1); }}>Clear</button>
          </div>
        </div>

        {loading ? <SkeletonTable rows={8} cols={7} /> : (
          <div className="card overflow-hidden">
            {!data?.rows?.length ? (
              <EmptyState icon={ListIcon} title="No entries found" description="Try adjusting your filters." />
            ) : (
              <>
                <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-500">{data?.total} entries</div>
                <table className="table-base">
                  <thead>
                    <tr><th>Date</th><th>PM</th><th>Project</th><th>Hours</th><th>Category</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {data?.rows?.map(e => (
                      <tr key={e.id}>
                        <td className="font-medium">{e.date}</td>
                        <td>{e.pm_name}</td>
                        <td>{e.project_name}</td>
                        <td>{e.hours}h</td>
                        <td className="text-gray-500">{e.category}</td>
                        <td><StatusBadge status={e.status} /></td>
                        <td>
                          <div className="flex gap-1">
                            {e.status === 'pending' && <>
                              <button className="btn-primary btn-sm btn" onClick={() => approve(e.id)}>✓ Approve</button>
                              <button className="btn btn-sm border border-red-200 text-red-600 hover:bg-red-50" onClick={() => { setRejectDialog(e); setRejectReason(''); }}>✗ Reject</button>
                            </>}
                            {e.status === 'approved' && (
                              <button className="btn btn-ghost btn-sm text-gray-500" onClick={() => reopen(e.id)}>Reopen</button>
                            )}
                          </div>
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

      <ConfirmDialog open={!!rejectDialog} title="Reject entry" confirmLabel="Reject" confirmClass="btn-danger" onConfirm={handleReject} onCancel={() => setRejectDialog(null)}>
        <div>
          <label className="label">Rejection reason</label>
          <textarea className="input resize-none" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why…" />
        </div>
      </ConfirmDialog>
    </AppLayout>
  );
}
