import { useEffect, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const LinkIcon = () => <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ pmId: '', projectId: '', assignedFrom: format(new Date(), 'yyyy-MM-dd') });
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

  return (
    <AppLayout title="Assignments">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" className="rounded" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
            Show all (including ended)
          </label>
          <button className="btn-primary" onClick={() => { setModal(true); setForm({ pmId: '', projectId: '', assignedFrom: format(new Date(), 'yyyy-MM-dd') }); setFormErr(''); }}>+ Assign PM</button>
        </div>

        {loading ? <SkeletonTable /> : assignments.length === 0 ? (
          <EmptyState icon={LinkIcon} title="No assignments" description="Assign a PM to a project to get started." action={<button className="btn-primary" onClick={() => setModal(true)}>Assign PM</button>} />
        ) : (
          <div className="card overflow-hidden">
            <table className="table-base">
              <thead><tr><th>PM</th><th>Project</th><th>From</th><th>To</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.pm_name}</td>
                    <td>{a.project_name}</td>
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
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Assign PM to project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">PM</label>
            <select className="input" value={form.pmId} onChange={e => setForm(f => ({ ...f, pmId: e.target.value }))} required>
              <option value="">Select PM…</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
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
