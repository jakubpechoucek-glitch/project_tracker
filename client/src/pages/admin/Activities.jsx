import { useEffect, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TagIcon = () => (
  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const BLANK = { name: '', sortOrder: '' };

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(BLANK);

  const [deactivateTarget, setDeactivateTarget] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/activities?includeInactive=${includeInactive}`);
      setActivities(res.data.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [includeInactive]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormErr('');
    setSaving(true);
    try {
      await api.post('/activities', {
        name: form.name,
        sortOrder: form.sortOrder !== '' ? parseInt(form.sortOrder, 10) : 0,
      });
      toast.success(`"${form.name}" added`);
      setCreateModal(false);
      setForm(BLANK);
      load();
    } catch (err) {
      setFormErr(err.response?.data?.error || 'Failed to create activity');
    } finally { setSaving(false); }
  }

  async function handleEdit(e) {
    e.preventDefault();
    try {
      await api.put(`/activities/${editTarget.id}`, {
        name: editForm.name,
        sortOrder: editForm.sortOrder !== '' ? parseInt(editForm.sortOrder, 10) : editTarget.sort_order,
      });
      toast.success('Activity updated');
      setEditTarget(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function handleDeactivate() {
    try {
      await api.post(`/activities/${deactivateTarget.id}/deactivate`);
      toast.success(`"${deactivateTarget.name}" deactivated`);
      setDeactivateTarget(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function handleReactivate(activity) {
    try {
      await api.post(`/activities/${activity.id}/reactivate`);
      toast.success(`"${activity.name}" reactivated`);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  return (
    <AppLayout title="Activities">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Activities appear as a dropdown when PMs log time. Deactivated activities are hidden from new entries but preserved in historical records.
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
              <input type="checkbox" className="rounded" checked={includeInactive}
                onChange={e => setIncludeInactive(e.target.checked)} />
              Show inactive activities
            </label>
          </div>
          <button className="btn-primary" onClick={() => { setCreateModal(true); setForm(BLANK); setFormErr(''); }}>
            + New Activity
          </button>
        </div>

        {/* Table */}
        {loading ? <SkeletonTable /> : activities.length === 0 ? (
          <EmptyState
            icon={TagIcon}
            title="No activities yet"
            description="Add activities that PMs can select when logging time."
            action={<button className="btn-primary" onClick={() => setCreateModal(true)}>+ New Activity</button>}
          />
        ) : (
          <div className="card overflow-hidden">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Activity name</th>
                  <th>Sort order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.map(a => (
                  <tr key={a.id} className={!a.is_active ? 'opacity-50' : ''}>
                    <td className="font-medium">{a.name}</td>
                    <td className="text-gray-500">{a.sort_order}</td>
                    <td>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        a.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => { setEditTarget(a); setEditForm({ name: a.name, sortOrder: String(a.sort_order) }); }}>
                          Edit
                        </button>
                        {a.is_active
                          ? <button className="btn btn-ghost btn-sm text-red-500"
                              onClick={() => setDeactivateTarget(a)}>
                              Deactivate
                            </button>
                          : <button className="btn btn-ghost btn-sm text-green-600"
                              onClick={() => handleReactivate(a)}>
                              Reactivate
                            </button>
                        }
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="New activity">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Activity name</label>
            <input className="input" placeholder="e.g. Development, Client Calls, Testing…"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Sort order <span className="text-gray-400 font-normal">(lower = appears first)</span></label>
            <input type="number" className="input w-28" placeholder="0"
              value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} />
          </div>
          {formErr && <p className="text-sm text-red-600">{formErr}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setCreateModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add Activity'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit activity">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="label">Activity name</label>
            <input className="input" value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Sort order</label>
            <input type="number" className="input w-28" value={editForm.sortOrder}
              onChange={e => setEditForm(f => ({ ...f, sortOrder: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" className="btn-primary">Save changes</button>
          </div>
        </form>
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmDialog
        open={!!deactivateTarget}
        title={`Deactivate "${deactivateTarget?.name}"?`}
        message="PMs won't see this activity in the dropdown for new entries. Existing time entries that used this activity are not affected."
        confirmLabel="Deactivate"
        confirmClass="btn-danger"
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </AppLayout>
  );
}
