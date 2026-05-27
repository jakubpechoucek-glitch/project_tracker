import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import BudgetBar from '../../components/ui/BudgetBar';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';
import toast from 'react-hot-toast';

const FolderIcon = () => <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>;
const BLANK = { name: '', description: '', budgetHours: '', billable: true, status: 'active' };

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [modal, setModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);

  async function load() {
    setLoading(true);
    try { const res = await api.get(`/projects?includeArchived=${includeArchived}`); setProjects(res.data.data); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [includeArchived]);

  async function handleSave(e) {
    e.preventDefault();
    setFormErr('');
    setSaving(true);
    try {
      const payload = { ...form, budgetHours: form.budgetHours !== '' ? parseFloat(form.budgetHours) : null };
      if (editTarget) { await api.put(`/projects/${editTarget.id}`, payload); toast.success('Project updated'); }
      else { await api.post('/projects', payload); toast.success('Project created'); }
      setModal(false); setEditTarget(null); setForm(BLANK); load();
    } catch (err) { setFormErr(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function handleArchive() {
    try { await api.post(`/projects/${archiveTarget.id}/archive`); toast.success('Project archived'); setArchiveTarget(null); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  function openEdit(p) {
    setEditTarget(p);
    setForm({ name: p.name, description: p.description || '', budgetHours: p.budget_hours, billable: !!p.billable, status: p.status });
    setModal(true); setFormErr('');
  }

  return (
    <AppLayout title="Projects">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" className="rounded" checked={includeArchived} onChange={e => setIncludeArchived(e.target.checked)} />
            Show archived projects
          </label>
          <button className="btn-primary" onClick={() => { setModal(true); setEditTarget(null); setForm(BLANK); setFormErr(''); }}>+ New project</button>
        </div>

        {loading ? <SkeletonTable /> : projects.length === 0 ? (
          <EmptyState icon={FolderIcon} title="No projects" description="Create your first project to get started." action={<button className="btn-primary" onClick={() => setModal(true)}>Create project</button>} />
        ) : (
          <div className="card overflow-hidden">
            <table className="table-base">
              <thead><tr><th>Project</th><th>Billable</th><th>Budget</th><th>Progress</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/admin/projects/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link>
                      {p.description && <p className="text-xs text-gray-400 truncate max-w-xs">{p.description}</p>}
                    </td>
                    <td>{p.billable ? <span className="text-green-600 text-xs font-medium">Billable</span> : <span className="text-gray-400 text-xs">Non-billable</span>}</td>
                    <td className="text-gray-600">{p.budget_hours != null ? `${p.budget_hours}h` : '—'}</td>
                    <td className="min-w-[150px]"><BudgetBar logged={p.hoursLogged || 0} budget={p.budget_hours} /></td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                        {p.status === 'active' && <button className="btn btn-ghost btn-sm text-amber-600" onClick={() => setArchiveTarget(p)}>Archive</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setEditTarget(null); }} title={editTarget ? 'Edit project' : 'New project'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Project name</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div><label className="label">Description</label><textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div><label className="label">Budget hours <span className="text-gray-400 font-normal">(optional)</span></label><input type="number" min="0" step="0.5" className="input" placeholder="e.g. 200" value={form.budgetHours} onChange={e => setForm(f => ({ ...f, budgetHours: e.target.value }))} /></div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="rounded" checked={form.billable} onChange={e => setForm(f => ({ ...f, billable: e.target.checked }))} />
              Billable project
            </label>
          </div>
          {editTarget && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}
          {formErr && <p className="text-sm text-red-600">{formErr}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => { setModal(false); setEditTarget(null); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create project'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!archiveTarget} title={`Archive "${archiveTarget?.name}"?`}
        message="Archived projects cannot accept new time entries. Existing entries are preserved."
        confirmLabel="Archive" confirmClass="btn btn-secondary"
        onConfirm={handleArchive} onCancel={() => setArchiveTarget(null)} />
    </AppLayout>
  );
}
