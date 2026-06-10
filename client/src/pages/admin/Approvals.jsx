import { useEffect, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';
import { format, startOfISOWeek, addDays } from 'date-fns';
import toast from 'react-hot-toast';

const CheckIcon = () => <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

function weekLabel(mondayStr) {
  const mon = new Date(mondayStr + 'T00:00:00');
  const sun = addDays(mon, 6);
  return `${format(mon, 'MMM d')} – ${format(sun, 'MMM d, yyyy')}`;
}

export default function Approvals() {
  const [pending, setPending] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [weekRejectDialog, setWeekRejectDialog] = useState(null);
  const [weekRejectReason, setWeekRejectReason] = useState('');
  const [reopenDialog, setReopenDialog] = useState(null);

  // Reopen tool state
  const [pms, setPms] = useState([]);
  const [reopenForm, setReopenForm] = useState({ pmId: '', week: 'current' });
  const [reopening, setReopening] = useState(false);

  // Week options — current and previous only
  const currentWeekStart = format(startOfISOWeek(new Date()), 'yyyy-MM-dd');
  const prevWeekStart    = format(addDays(startOfISOWeek(new Date()), -7), 'yyyy-MM-dd');

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/entries/pending');
      setPending(res.data.data);
      const map = {};
      await Promise.all(res.data.data.map(async pm => {
        const r = await api.get(`/entries?pmId=${pm.pm_id}&status=pending`);
        map[pm.pm_id] = r.data.data.rows || [];
      }));
      setEntries(map);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    api.get('/users').then(r => setPms(r.data.data.filter(u => u.role === 'pm' && u.is_active)));
  }, []);

  function groupByWeek(ents) {
    const groups = {};
    for (const e of ents) {
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
      setRejectDialog(null); setRejectReason('');
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
      setWeekRejectDialog(null); setWeekRejectReason('');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function handleReopenWeek() {
    const { pmId, pmName, weekStart } = reopenDialog;
    try {
      await api.post('/entries/reopen-week', { pmId, week: weekStart });
      toast.success(`Week reopened — ${pmName} can now edit their timesheet`);
      setReopenDialog(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function handleReopenTool() {
    if (!reopenForm.pmId) return;
    const weekStart = reopenForm.week === 'current' ? currentWeekStart : prevWeekStart;
    const pm = pms.find(p => p.id === parseInt(reopenForm.pmId));
    setReopenDialog({ pmId: parseInt(reopenForm.pmId), pmName: pm?.name || `PM #${reopenForm.pmId}`, weekStart });
  }

  return (
    <AppLayout title="Pending Approvals">
      <div className="space-y-6">

        {/* ── Reopen week tool (always visible) ── */}
        <div className="card card-body">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-xl">🔓</span>
            <div>
              <h2 className="mb-0.5">Reopen submitted week</h2>
              <p className="text-sm text-gray-500">
                Allow a PM to re-edit a submitted or approved timesheet.
                Only the <strong>current</strong> or <strong>previous</strong> week can be reopened.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="label">PM</label>
              <select className="input" value={reopenForm.pmId}
                onChange={e => setReopenForm(f => ({ ...f, pmId: e.target.value }))}>
                <option value="">Select PM…</option>
                {pms.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="label">Week</label>
              <select className="input" value={reopenForm.week}
                onChange={e => setReopenForm(f => ({ ...f, week: e.target.value }))}>
                <option value="current">Current week — {weekLabel(currentWeekStart)}</option>
                <option value="prev">Previous week — {weekLabel(prevWeekStart)}</option>
              </select>
            </div>
            <button
              className="btn btn-ghost border border-amber-200 text-amber-700 hover:bg-amber-50 font-medium"
              onClick={handleReopenTool}
              disabled={!reopenForm.pmId}>
              ↩ Reopen week
            </button>
          </div>
        </div>

        {/* ── Pending approvals ── */}
        {loading ? <SkeletonTable /> : pending.length === 0 ? (
          <EmptyState icon={CheckIcon} title="All caught up!" description="No pending timesheets to review." />
        ) : pending.map(pm => {
          const pmEntries = entries[pm.pm_id] || [];
          const weeks = groupByWeek(pmEntries);
          return (
            <div key={pm.pm_id} className="card">
              <div className="card-body border-b border-gray-100 flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(e => ({ ...e, [pm.pm_id]: !e[pm.pm_id] }))}>
                <div>
                  <h2>{pm.pm_name}</h2>
                  <p className="text-sm text-gray-500">
                    {pm.entry_count} entr{pm.entry_count === 1 ? 'y' : 'ies'} · {parseFloat(pm.total_hours).toFixed(1)}h pending
                  </p>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded[pm.pm_id] ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {expanded[pm.pm_id] && Object.entries(weeks).map(([weekStart, wEntries]) => (
                <div key={weekStart} className="border-b border-gray-100 last:border-0">
                  <div className="px-6 py-3 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm font-semibold text-gray-700">
                      Week of {weekLabel(weekStart)}
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        className="btn btn-ghost btn-sm text-amber-600 border border-amber-200 hover:bg-amber-50"
                        onClick={() => setReopenDialog({ pmId: pm.pm_id, pmName: pm.pm_name, weekStart })}>
                        ↩ Reopen
                      </button>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => { setWeekRejectDialog({ pmId: pm.pm_id, weekStart }); setWeekRejectReason(''); }}>
                        Reject all
                      </button>
                      <button className="btn-primary btn-sm btn"
                        onClick={() => approveWeek(pm.pm_id, weekStart)}>
                        Approve all
                      </button>
                    </div>
                  </div>
                  <table className="table-base">
                    <thead>
                      <tr><th>Date</th><th>Project</th><th>Hours</th><th>Category</th><th>Description</th><th>Status</th><th>Actions</th></tr>
                    </thead>
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
                              <button className="btn btn-sm border border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => { setRejectDialog(e); setRejectReason(''); }}>✗</button>
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
          <textarea className="input resize-none" rows={3} value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Explain why this entry is being rejected…" />
        </div>
      </ConfirmDialog>

      {/* Reopen week confirmation */}
      <ConfirmDialog
        open={!!reopenDialog}
        title="Reopen this week for editing?"
        message=""
        confirmLabel="Reopen week"
        confirmClass="btn-primary"
        onConfirm={handleReopenWeek}
        onCancel={() => setReopenDialog(null)}
      >
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            All submitted entries for <strong>{reopenDialog?.pmName}</strong> — week of{' '}
            <strong>{reopenDialog && weekLabel(reopenDialog.weekStart)}</strong>{' '}
            — will be returned to <strong>draft</strong>.
          </p>
          <p className="text-sm text-gray-500">
            The PM will be able to edit and re-submit their timesheet.
          </p>
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
          <textarea className="input resize-none" rows={3} value={weekRejectReason}
            onChange={e => setWeekRejectReason(e.target.value)}
            placeholder="Explain why this week is being rejected…" />
        </div>
      </ConfirmDialog>
    </AppLayout>
  );
}
