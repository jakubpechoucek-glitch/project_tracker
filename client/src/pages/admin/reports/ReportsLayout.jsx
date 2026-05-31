import { NavLink, Outlet } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import clsx from 'clsx';

const TABS = [
  { to: '/admin/reports/monthly', label: 'Monthly Summary' },
  { to: '/admin/reports/budget', label: 'Budget' },
  { to: '/admin/reports/workload', label: 'PM Workload' },
  { to: '/admin/reports/timeline', label: 'Timeline' },
  { to: '/admin/reports/approval', label: 'Approvals' },
  { to: '/admin/reports/activity', label: 'Activity' },
];

export default function ReportsLayout() {
  return (
    <AppLayout title="Reports">
      <div className="space-y-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {TABS.map(t => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) =>
              clsx('px-4 py-2 rounded-md text-sm font-medium transition-colors', isActive ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900')
            }>{t.label}</NavLink>
          ))}
        </div>
        <Outlet />
      </div>
    </AppLayout>
  );
}
