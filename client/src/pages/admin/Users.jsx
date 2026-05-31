import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';
import toast from 'react-hot-toast';

const UsersIcon = () => <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;

const BLANK = { name: '', email: '', password: '', role: 'pm' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateDate, setDeactivateDate] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '' });

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/users?includeInactive=${includeInactive}`);
      setUsers(res.data.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [includeInactive]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormErr('');
    setSaving(true);
    try {
      await api.post('/users', form);
      toast.success(`${form.name} added. They'll be prompted to set a new password on first login.`);
      setModal(false);
      setForm(BLANK);
      load();
    } catch (err) {
      setFormErr(err.response?.data?.error || 'Failed to create user');
    } finally { setSaving(false); }
  }

  async function handleDeactivate() {
    try {
      await api.post(`/users/${deactivateTarget.id}/deactivate`, { endDate: deactivateDate || undefined });
      toast.success(`${deactivateTarget.name} deactivated`);
      setDeactivateTarget(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function handleReactivate(user) {
    try {
      await api.post(`/users/${user.id}/reactivate`);
      toast.success(`${user.name} reactivated`);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function handleEdit(e) {
    e.preventDefault();
    try {
      await api.put(`/users/${editTarget.id}`, editForm);
      toast.success('User updated');
      setEditTarget(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  return (
    <AppLayout title="User Management">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" className="rounded" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} />
            Show inactive users
          </label>
          <button className="btn-primary" onClick={() => { setModal(true); setForm(BLANK); setFormErr(''); }}>+ Add User</button>
        </div>

        {loading ? <SkeletonTable /> : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" description="Add a user to get started." action={<button className="btn-primary" onClick={() => setModal(true)}>Add User</button>} />
        ) : (
          <div className="card overflow-hidden">
            <table className="table-base">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>First login</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><Link to={`/admin/users/${u.id}`} className="font-medium text-primary hover:underline">{u.name}</Link></td>
                    <td className="text-gray-500">{u.email}</td>
                    <td><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{u.role}</span></td>
                    <td><StatusBadge status={u.is_active ? 'active' : 'archived'} /></td>
                    <td>{u.is_first_login ? <span className="text-xs text-amber-600 font-medium">Pending first login</span> : <span className="text-xs text-gray-400">Set</span>}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditTarget(u); setEditForm({ name: u.name, email: u.email }); }}>Edit</button>
                        {u.is_active
                          ? <button className="btn btn-ghost btn-sm text-red-500" onClick={() => { setDeactivateTarget(u); setDeactivateDate(''); }}>Deactivate</button>
                          : <button className="btn btn-ghost btn-sm text-green-600" onClick={() => handleReactivate(u)}>Reactivate</button>
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

      {/* Add PM modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add new user">
        <form onSubmit={handleCreate} className="space-y-4">
          <div><label className="label">Full name</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="pm">PM — can log time</option>
              <option value="admin">Admin — full access</option>
            </select>
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input type="text" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            <p className="text-xs text-gray-400 mt-1">Min 8 chars, uppercase, lowercase, number. User will be forced to change on first login.</p>
          </div>
          {formErr && <p className="text-sm text-red-600">{formErr}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add User'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit user">
        <form onSubmit={handleEdit} className="space-y-4">
          <div><label className="label">Name</label><input className="input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div><label className="label">Email</label><input type="email" className="input" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required /></div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
            <button type="submit" className="btn-primary">Save changes</button>
          </div>
        </form>
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmDialog open={!!deactivateTarget} title={`Deactivate ${deactivateTarget?.name}?`}
        message="This will end all active assignments and prevent login. You can reactivate them later."
        confirmLabel="Deactivate" confirmClass="btn-danger"
        onConfirm={handleDeactivate} onCancel={() => setDeactivateTarget(null)}>
        <div>
          <label className="label">End assignments on (default: today)</label>
          <input type="date" className="input" value={deactivateDate} onChange={e => setDeactivateDate(e.target.value)} />
        </div>
      </ConfirmDialog>
    </AppLayout>
  );
}
