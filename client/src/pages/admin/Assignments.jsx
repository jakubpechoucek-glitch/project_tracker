import { useEffect, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, startOfISOWeek } from 'date-fns';

const LinkIcon = () => <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;

// 10-colour palette — deterministic from PM id
const PALETTE = [
  { dot: '#2563EB', bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  { dot: '#16A34A', bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
  { dot: '#D97706', bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  { dot: '#7C3AED', bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
  { dot: '#0891B2', bg: '#ECFEFF', text: '#155E75', border: '#A5F3FC' },
  { dot: '#DB2777', bg: '#FDF2F8', text: '#9D174D', border: '#FBCFE8' },
  { dot: '#059669', bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7' },
  { dot: '#EA580C', bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA' },
  { dot: '#4F46E5', bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE' },
  { dot: '#0F766E', bg: '#F0FDFA', text: '#134E4A', border: '#99F6E4' },
];

function getPmColor(pmId) {
  return PALETTE[pmId % PALETTE.length];
}

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ pmId: '', projectId: '', assignedFrom: format(startOfISOWeek(new Date()), 'yyyy-MM-dd') });
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [endTarget, setEndTarget] = useState(null);
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  async function load() {
    setLoading(true);
    try {
      const url = showAll ? '/assignments' : '/assignments?active=true';
      const res = await api.get(url);
      setAssignments(res.data.data);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data.data.filter(u => u.role === 'pm')));
    api.get('/projects').then(r => setProjects(r.data.data));
  }, []);

  useEffect(() => { load(); }, [showAll]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormErr('');
    setSaving(true);
    try {
      await api.post('/assignments', { pmId: parseInt(form.pmId), projectId: parseInt(form.projectId), assignedFrom: form.assignedFrom });
      toast.success('Assignment created');
      setModal(false);
      load();
    } catch (err) { setFormErr(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function handleEnd() {
    try {
      await api.post(`/assignments/${endTarget.id}/end`, { assignedTo: endDate });
      toast.success('Assignment ended');
      setEndTarget(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  // Group assignments by PM for colour-coded display
  const grouped = assignments.reduce((acc, a) => {
    if (!acc[a.pm_id]) acc[a.pm_id] = { pm_id: a.pm_id, pm_name: a.pm_name, items: [] };
    acc[a.pm_id].items.push(a);
    return acc;
  }, {});
  const pmGroups = Object.values(grouped).sort((a, b) => a.pm_name.localeCompare(b.pm_name));

  return (
    <AppLayout title="Assignments">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" className="rounded" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
            Show all (including ended)
          </label>
          <button className="btn-primary" onClick={() => { setModal(true); setForm({ pmId: '', projectId: '', assignedFrom: format(startOfISOWeek(new Date()), 'yyyy-MM-dd') }); setFormErr(''); }}>+ Assign PM</button>
        </div>

        {loading ? <SkeletonTable /> : pmGroups.length === 0 ? (
          <EmptyState icon={LinkIcon} title="No assignments" description="Assign a PM to a project to get started." action={<button className="btn-primary" onClick={() => setModal(true)}>Assign PM</button>} />
        ) : (
          <div className="space-y-3">
            {pmGroups.map(group => {
              const color = getPmColor(group.pm_id);
              return (
                <div key={group.pm_id} className="card overflow-hidden" style={{ borderLeft: `4px solid ${color.dot}` }}>
                  {/* PM header */}
                  <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: color.bg }}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color.dot }} />
                    <span className="text-sm font-semibold" style={{ color: color.text }}>{group.pm_name}</span>
                    <span className="text-xs ml-1" style={{ color: color.text, opacity: 0.7 }}>
                      {group.items.filter(i => !i.assigned_to).length} active · {group.items.length} total
                    </span>
                  </div>
                  {/* Project rows */}
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map(a => (
                        <tr key={a.id} style={{ backgroundColor: color.bg }}>
                          <td className="font-medium">{a.project_name}</td>
                          <td>{a.assigned_from}</td>
                          <td>{a.assigned_to || '—'}</td>
                          <td><StatusBadge status={a.assigned_to ? 'archived' : 'active'} /></td>
                          <td>
                            {!a.assigned_to && (
                              <button className="btn btn-ghost btn-sm text-red-500" onClick={() => { setEndTarget(a); setEndDate(format(new Date(), 'yyyy-MM-dd')); }}>End</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Assign PM to project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">PM</label>
            <select className="input" value={form.pmId} onChange={e => setForm(f => ({ ...f, pmId: e.target.value }))} required>
              <option value="">Select PM…</option>
              {users.map(u => {
                const c = getPmColor(u.id);
                return <option key={u.id} value={u.id}>{u.name}</option>;
              })}
            </select>
          </div>
          {/* Color preview for selected PM */}
          {form.pmId && (() => {
            const c = getPmColor(parseInt(form.pmId));
            return (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: c.bg, color: c.text }}>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.dot }} />
                {users.find(u => u.id === parseInt(form.pmId))?.name} will be assigned this color
              </div>
            );
          })()}
          <div>
            <label className="label">Project</label>
            <select className="input" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} required>
              <option value="">Select project…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Start date</label>
            <input type="date" className="input" value={form.assignedFrom} onChange={e => setForm(f => ({ ...f, assignedFrom: e.target.value }))} required />
          </div>
          {formErr && <p className="text-sm text-red-600">{formErr}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Assigning…' : 'Assign'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!endTarget} title="End assignment?" confirmLabel="End assignment" confirmClass="btn-danger"
        onConfirm={handleEnd} onCancel={() => setEndTarget(null)}
        message={`End ${endTarget?.pm_name}'s assignment to ${endTarget?.project_name}?`}>
        <div>
          <label className="label">End date</label>
          <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </ConfirmDialog>
    </AppLayout>
  );
}
