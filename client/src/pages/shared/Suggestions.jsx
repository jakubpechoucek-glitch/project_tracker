import { useEffect, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const StarIcon = () => <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;

const CATEGORIES = ['UX', 'Reporting', 'Workflow', 'Other'];
const STATUSES = ['new', 'under_review', 'planned', 'done', 'dismissed'];

const BLANK = { title: '', description: '', category: 'UX' };

export default function Suggestions() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'under_review', adminComment: '' });

  async function load() {
    setLoading(true);
    try { const res = await api.get('/suggestions'); setSuggestions(res.data.data); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setFormErr('');
    setSaving(true);
    try {
      await api.post('/suggestions', form);
      toast.success('Suggestion submitted! Thank you for your feedback.');
      setModal(false);
      setForm(BLANK);
      load();
    } catch (err) { setFormErr(err.response?.data?.error || 'Failed to submit'); }
    finally { setSaving(false); }
  }

  async function handleReview(e) {
    e.preventDefault();
    try {
      await api.put(`/suggestions/${reviewTarget.id}/status`, reviewForm);
      toast.success('Suggestion updated');
      setReviewTarget(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = suggestions.filter(sg => sg.status === s);
    return acc;
  }, {});

  const statusLabel = { new: 'New', under_review: 'Under Review', planned: 'Planned', done: 'Done', dismissed: 'Dismissed' };

  return (
    <AppLayout title="Feature Suggestions">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Share your ideas to improve Project Tracker. All suggestions are visible to the admin team.</p>
          <button className="btn-primary" onClick={() => { setModal(true); setForm(BLANK); setFormErr(''); }}>+ Submit idea</button>
        </div>

        {loading ? <SkeletonTable /> : suggestions.length === 0 ? (
          <EmptyState icon={StarIcon} title="No suggestions yet" description="Be the first to share an idea!"
            action={<button className="btn-primary" onClick={() => setModal(true)}>Submit first idea</button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {STATUSES.filter(s => grouped[s].length > 0 || isAdmin).map(s => (
              <div key={s} className="card">
                <div className="card-body border-b border-gray-100 flex items-center justify-between">
                  <StatusBadge status={s} />
                  <span className="text-xs text-gray-400">{grouped[s].length}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {grouped[s].length === 0 ? (
                    <div className="p-4 text-xs text-gray-400 text-center">None</div>
                  ) : grouped[s].map(sg => (
                    <div key={sg.id} className="p-4 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800">{sg.title}</p>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">{sg.category}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{sg.description}</p>
                      <p className="text-xs text-gray-400">by {sg.user_name}</p>
                      {sg.admin_comment && (
                        <div className="mt-2 p-2 bg-primary-light rounded text-xs text-primary-dark">
                          <strong>Admin: </strong>{sg.admin_comment}
                        </div>
                      )}
                      {isAdmin && (
                        <button className="btn btn-ghost btn-sm text-xs mt-1" onClick={() => { setReviewTarget(sg); setReviewForm({ status: sg.status, adminComment: sg.admin_comment || '' }); }}>
                          Update status
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Submit a feature idea">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Short, descriptive title" maxLength={100} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required placeholder="Describe the problem or workflow you'd like improved…" />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {formErr && <p className="text-sm text-red-600">{formErr}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit idea'}</button>
          </div>
        </form>
      </Modal>

      {/* Admin review modal */}
      <Modal open={!!reviewTarget} onClose={() => setReviewTarget(null)} title="Update suggestion status">
        <form onSubmit={handleReview} className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold">{reviewTarget?.title}</p>
            <p className="text-xs text-gray-500 mt-1">{reviewTarget?.description}</p>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={reviewForm.status} onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))}>
              {STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Admin comment (optional)</label>
            <textarea className="input resize-none" rows={3} value={reviewForm.adminComment} onChange={e => setReviewForm(f => ({ ...f, adminComment: e.target.value }))} placeholder="Leave a note for the PM…" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setReviewTarget(null)}>Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
