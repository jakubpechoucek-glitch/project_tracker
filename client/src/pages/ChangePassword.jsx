import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const POLICY = 'At least 8 characters, one uppercase, one lowercase, one number.';

export default function ChangePassword() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const isFirstLogin = user?.isFirstLogin;

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (form.newPassword !== form.confirm) { setErr('Passwords do not match'); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.newPassword)) { setErr(POLICY); return; }
    setLoading(true);
    try {
      await changePassword(form.currentPassword, form.newPassword);
      toast.success('Password changed successfully!');
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (error) {
      setErr(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
        <span className="text-white text-xl font-bold">PT</span>
      </div>

      <div className="card w-full max-w-sm mt-4">
        <div className="card-body">
          {isFirstLogin && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <strong>First login detected.</strong> You must set a new password before continuing.
            </div>
          )}
          <h2 className="font-semibold text-gray-800 mb-4">{isFirstLogin ? 'Set your password' : 'Change password'}</h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {!isFirstLogin && (
              <div>
                <label className="label">Current password</label>
                <input type="password" className="input" value={form.currentPassword}
                  onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} required />
              </div>
            )}
            <div>
              <label className="label">New password</label>
              <input type="password" className="input" value={form.newPassword}
                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} required autoFocus={isFirstLogin} />
              <p className="text-xs text-gray-400 mt-1">{POLICY}</p>
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input type="password" className="input" value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
            </div>

            {err && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{err}</p>}

            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
