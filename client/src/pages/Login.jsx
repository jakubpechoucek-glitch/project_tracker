import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (user.isFirstLogin) {
        navigate('/change-password');
      } else {
        navigate(user.role === 'admin' ? '/admin' : '/dashboard');
        toast.success(`Welcome back, ${user.name}!`);
      }
    } catch (error) {
      setErr(error.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <span className="text-white text-xl font-bold">PT</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Project Tracker</h1>
        <p className="text-sm text-gray-500 mt-1">Home Credit Philippines</p>
      </div>

      <div className="card w-full max-w-sm">
        <div className="card-body">
          <h2 className="text-center text-base font-semibold text-gray-700 mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input
                id="email" type="email" className="input" placeholder="you@homecredit.ph"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required autoComplete="email" autoFocus
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password" type={showPw ? 'text' : 'password'} className="input pr-10"
                  placeholder="Enter your password"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required autoComplete="current-password"
                />
                <button type="button" className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600" onClick={() => setShowPw(v => !v)}>
                  {showPw
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>

            {err && (
              <div role="alert" className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {err}
              </div>
            )}

            <button type="submit" className="btn-primary w-full justify-center mt-2" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6">Internal use only · Home Credit Philippines</p>
    </div>
  );
}
