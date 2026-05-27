import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import StatusBadge from '../../components/ui/StatusBadge';
import { SkeletonCard } from '../../components/ui/LoadingSkeleton';
import api from '../../services/api';

export default function UserDetail() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${id}`).then(r => setUser(r.data.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AppLayout title="User Profile"><div className="space-y-4"><SkeletonCard /><SkeletonCard /></div></AppLayout>;
  if (!user) return <AppLayout title="User Profile"><p className="text-gray-500">User not found.</p></AppLayout>;

  return (
    <AppLayout title={`Profile: ${user.name}`}>
      <div className="space-y-6 max-w-3xl">
        <Link to="/admin/users" className="text-sm text-primary hover:underline">← Back to Users</Link>

        {/* Info card */}
        <div className="card card-body grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div><p className="text-xs text-gray-400 uppercase tracking-wide">Name</p><p className="font-semibold">{user.name}</p></div>
          <div><p className="text-xs text-gray-400 uppercase tracking-wide">Email</p><p className="text-sm">{user.email}</p></div>
          <div><p className="text-xs text-gray-400 uppercase tracking-wide">Status</p><StatusBadge status={user.is_active ? 'active' : 'archived'} /></div>
          <div><p className="text-xs text-gray-400 uppercase tracking-wide">Total hours</p><p className="font-semibold">{user.totalHours?.toFixed(1)}h</p></div>
          <div><p className="text-xs text-gray-400 uppercase tracking-wide">Approved hours</p><p className="font-semibold text-green-600">{user.approvedHours?.toFixed(1)}h</p></div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Approval rate</p>
            <p className="font-semibold">{user.submittedHours > 0 ? `${((user.approvedHours / user.submittedHours) * 100).toFixed(0)}%` : '—'}</p>
          </div>
        </div>

        {/* Assignment history */}
        <div className="card">
          <div className="card-body border-b border-gray-100"><h2>Assignment history</h2></div>
          {user.assignments?.length === 0 ? (
            <div className="p-6 text-sm text-gray-400 text-center">No assignments on record.</div>
          ) : (
            <table className="table-base">
              <thead><tr><th>Project</th><th>From</th><th>To</th><th>Status</th></tr></thead>
              <tbody>
                {user.assignments.map(a => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.project_name}</td>
                    <td>{a.assigned_from}</td>
                    <td>{a.assigned_to || <span className="text-green-600 text-xs font-medium">Active</span>}</td>
                    <td><StatusBadge status={a.assigned_to ? 'archived' : 'active'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
