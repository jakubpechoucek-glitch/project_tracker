import { useEffect, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';
import { format, startOfISOWeek, endOfISOWeek, addDays } from 'date-fns';
import toast from 'react-hot-toast';

const CheckIcon = () => <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

export default function Approvals() {
  const [pending, setPending] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [weekRejectDialog, setWeekRejectDialog] = useState(null);
  const [weekRejectReason, setWeekRejectReason] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/entries/pending');
      setPending(res.data.data);
      // Load entries for each PM
      const entriresMap = {};
      await Promise.all(res.data.data.map(async pm => {
        const weekRes = await api.get(`/entries?pmId=${pm.pm_id}&status=pending`);
        entriresMap[pm.pm_id] = weekRes.data.data.rows || [];
      }));
      setEntries(entriresMap);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function groupByWeek(entries) {
    const groups = {};
    for (const e of entries) {
      const ws = format(startOfISOWeek(new Date(e.date + 'T00:00:00')), 'yyyy-MM-dd');
      if (!groups[ws]) groups[ws] = [];
      groups[ws].push(e);
    }
    return groups;
  }

  async function approveEntry(id) {
    try {
      await api.post(`/entries/${id}/approve`);
      toast.success('Entry approved');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function handleRejectEntry() {
    try {
      await api.post(`/entries/${rejectDialog.id}/reject`, { reason: rejectReason });
      toast.success('Entry rejected');
      setRejectDialog(null);
      setRejectReason('');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function approveWeek(pmId, weekStart) {
    try {
      await api.post('/entries/approve-week', { pmId, week: weekStart });
      toast.success('Week approved');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function handleRejectWeek() {
    try {
      await api.post('/entries/reject-week', { pmId: weekRejectDialog.pmId, week: weekRejectDialog.weekStart, reason: weekRejectReason });
      toast.success('Week rejected');
      setWeekRejectDialog(null);
      setWeekRejectReason('');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  return (
    <AppLayout title="Pending Approvals">
      <div className="space-y-6">
        {loading ? <SkeletonTable /> : pending.length === 0 ? (
          <EmptyState icon={CheckIcon} title="All caught up!" description="No pending timesheets to review." />
        ) : pending.map(pm => {
          const pmEntries = entries[pm.pm_id] || [];
          const weeks = groupByWeek(pmEntries);
          return (
            <div key={pm.pm_id} className="card">
              <div className="card-body border-b border-gray-100 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(e => ({ ...e, [pm.pm_id]: !e[pm.pm_id] }))}>
                <div>
                  <h2>{pm.pm_name}</h2>
                  <p className="text-sm text-gray-500">{pm.entry_count} entr{pm.entry_count === 1 ? 'y' : 'ies'} · {parseFloat(pm.total_hours).toFixed(1)}h pending</p>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded[pm.pm_id] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>

              {expanded[pm.pm_id] && Object.entries(weeks).map(([weekStart, wEntries]) => (
                <div key={weekStart} className="border-b border-gray-100 last:border-0">
                  <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      Week of {format(new Date(weekStart + 'T00:00:00'), 'MMM d')} — {format(addDays(new Date(weekStart + 'T00:00:00'), 6), 'MMM d, yyyy')}
                    </span>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" onClick={() => { setWeekRejectDialog({ pmId: pm.pm_id, weekStart }); setWeekRejectReason(''); }}>Reject all</button>
                      <button className="btn-primary btn-sm btn" onClick={() => approveWeek(pm.pm_id, weekStart)}>Approve all</button>
                    </div>
                  </div>
                  <table className="table-base">
                    <thead><tr><th>Date</th><th>Project</th><th>Hours</th><th>Category</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {wEntries.map(e => (
                        <tr key={e.id}>
                          <td className="font-medium">{e.date}</td>
                          <td>{e.project_name}</td>
                          <td>{e.hours}h</td>
                          <td className="text-gray-500">{e.category}</td>
                          <td className="text-gray-500 max-w-xs truncate">{e.description || '—'}</td>
                          <td><StatusBadge status={e.status} /></td>
                          <td>
                            <div className="flex gap-1">
                              <button className="btn-primary btn-sm btn" onClick={() => approveEntry(e.id)}>✓</button>
                              <button className="btn btn-sm border border-red-200 text-red-600 hover:bg-red-50" onClick={() => { setRejectDialog(e); setRejectReason(''); }}>✗</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Reject single entry */}
      <ConfirmDialog
        open={!!rejectDialog}
        title="Reject entry"
        message={`Reject ${rejectDialog?.hours}h on ${rejectDialog?.date} for ${rejectDialog?.project_name}?`}
        confirmLabel="Reject"
        confirmClass="btn-danger"
        onConfirm={handleRejectEntry}
        onCancel={() => setRejectDialog(null)}
      >
        <div>
          <label className="label">Rejection reason (required)</label>
          <textarea className="input resize-none" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this entry is being rejected…" />
        </div>
      </ConfirmDialog>

      {/* Reject whole week */}
      <ConfirmDialog
        open={!!weekRejectDialog}
        title="Reject entire week"
        message="All pending entries for this week will be returned to the PM for correction."
        confirmLabel="Reject Week"
        confirmClass="btn-danger"
        onConfirm={handleRejectWeek}
        onCancel={() => setWeekRejectDialog(null)}
      >
        <div>
          <label className="label">Rejection reason (required)</label>
          <textarea className="input resize-none" rows={3} value={weekRejectReason} onChange={e => setWeekRejectReason(e.target.value)} placeholder="Explain why this week is being rejected…" />
        </div>
      </ConfirmDialog>
    </AppLayout>
  );
}
