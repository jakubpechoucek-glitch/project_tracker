import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import PMDashboard from './pages/pm/Dashboard';
import Timesheet from './pages/pm/Timesheet';
import MyEntries from './pages/pm/MyEntries';
import AdminDashboard from './pages/admin/Dashboard';
import Approvals from './pages/admin/Approvals';
import AllEntries from './pages/admin/AllEntries';
import Users from './pages/admin/Users';
import UserDetail from './pages/admin/UserDetail';
import Projects from './pages/admin/Projects';
import ProjectDetail from './pages/admin/ProjectDetail';
import Assignments from './pages/admin/Assignments';
import AuditLog from './pages/admin/AuditLog';
import ReportsLayout from './pages/admin/reports/ReportsLayout';
import MonthlySummary from './pages/admin/reports/MonthlySummary';
import BudgetReport from './pages/admin/reports/BudgetReport';
import WorkloadReport from './pages/admin/reports/WorkloadReport';
import TimelineReport from './pages/admin/reports/TimelineReport';
import ApprovalReport from './pages/admin/reports/ApprovalReport';
import Suggestions from './pages/shared/Suggestions';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.isFirstLogin) return <Navigate to="/change-password" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function PMRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'pm') return <Navigate to="/admin" replace />;
  return children;
}

function RoleRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />

          <Route path="/" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />

          {/* PM routes */}
          <Route path="/dashboard" element={<ProtectedRoute><PMRoute><PMDashboard /></PMRoute></ProtectedRoute>} />
          <Route path="/timesheet" element={<ProtectedRoute><PMRoute><Timesheet /></PMRoute></ProtectedRoute>} />
          <Route path="/my-entries" element={<ProtectedRoute><PMRoute><MyEntries /></PMRoute></ProtectedRoute>} />

          {/* Shared */}
          <Route path="/suggestions" element={<ProtectedRoute><Suggestions /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/approvals" element={<ProtectedRoute><AdminRoute><Approvals /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/entries" element={<ProtectedRoute><AdminRoute><AllEntries /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><Users /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/users/:id" element={<ProtectedRoute><AdminRoute><UserDetail /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/projects" element={<ProtectedRoute><AdminRoute><Projects /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/projects/:id" element={<ProtectedRoute><AdminRoute><ProjectDetail /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/assignments" element={<ProtectedRoute><AdminRoute><Assignments /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute><AdminRoute><AuditLog /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute><AdminRoute><ReportsLayout /></AdminRoute></ProtectedRoute>}>
            <Route index element={<Navigate to="monthly" replace />} />
            <Route path="monthly" element={<MonthlySummary />} />
            <Route path="budget" element={<BudgetReport />} />
            <Route path="workload" element={<WorkloadReport />} />
            <Route path="timeline" element={<TimelineReport />} />
            <Route path="approval" element={<ApprovalReport />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
