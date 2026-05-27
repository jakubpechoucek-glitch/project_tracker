import { useEffect, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';

const ShieldIcon = () => <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;

const ACTION_COLOR = {
  CREATE: 'text-green-600', UPDATE: 'text-blue-600', DELETE: 'text-red-600',
  DEACTIVATE: 'text-red-600', REACTIVATE: 'text-green-600',
  APPROVE: 'text-green-600', REJECT: 'text-red-600', REOPEN: 'text-amber-600',
  SUBMIT_WEEK: 'text-blue-600', LOGIN_SUCCESS: 'text-gray-500', LOGIN_FAILED: 'text-red-500',
  ACCOUNT_LOCKED: 'text-red-700', PASSWORD_CHANGED: 'text-purple-600',
  ASSIGN: 'text-blue-600', END_ASSIGNMENT: 'text-amber-600', ARCHIVE: 'text-amber-600',
};

export default function AuditLog() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  async function load(p = page, s = search) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, pageSize: 20 });
      if (s) params.set('search', s);
      const res = await api.get(`/audit?${params}`);
      setData(res.data.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    load(1, search);
  }

  return (
    <AppLayout title="Audit Log">
      <div className="space-y-4">
        <div className="card card-body">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input className="input flex-1" placeholder="Search by action, entity, or user…" value={search} onChange={e => setSearch(e.target.value)} />
            <button type="submit" className="btn-primary">Search</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setSearch(''); setPage(1); load(1, ''); }}>Clear</button>
          </form>
        </div>

        {loading ? <SkeletonTable rows={8} cols={5} /> : data?.rows?.length === 0 ? (
          <EmptyState icon={ShieldIcon} title="No audit entries" description="Actions will appear here as they occur." />
        ) : (
          <div className="card overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-500">{data?.total} entries</div>
            <table className="table-base">
              <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead>
              <tbody>
                {data?.rows?.map(a => (
                  <tr key={a.id}>
                    <td className="text-gray-500 text-xs whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                    <td><span className="font-medium">{a.user_name || '—'}</span>{a.user_email && <span className="block text-xs text-gray-400">{a.user_email}</span>}</td>
                    <td><span className={`text-xs font-semibold uppercase ${ACTION_COLOR[a.action] || 'text-gray-600'}`}>{a.action}</span></td>
                    <td className="text-gray-500 text-sm">{a.entity_type}{a.entity_id ? ` #${a.entity_id}` : ''}</td>
                    <td className="text-xs text-gray-400 max-w-xs truncate">
                      {a.detail ? (() => { try { return JSON.stringify(JSON.parse(a.detail), null, 0); } catch { return a.detail; } })() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={data?.totalPages} onPage={p => { setPage(p); load(p); }} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
