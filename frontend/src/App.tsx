import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import Login from '@/pages/Login';
import Setup2FA from '@/pages/Setup2FA';
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import NewTransaction from '@/pages/NewTransaction';
import ConfirmTransaction from '@/pages/ConfirmTransaction';
import NotFound from '@/pages/NotFound';
import { Suspense, lazy } from 'react';
import { SkeletonCard } from '@/components/ui/Skeleton';

const Users         = lazy(() => import('@/pages/Users'));
const Zones         = lazy(() => import('@/pages/Zones'));
const Rates         = lazy(() => import('@/pages/Rates'));
const Reports       = lazy(() => import('@/pages/Reports'));
const AuditLogs     = lazy(() => import('@/pages/AuditLogs'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Profile       = lazy(() => import('@/pages/Profile'));

const PageLoader = () => (
  <div className="space-y-4 mt-6">
    <SkeletonCard /><SkeletonCard /><SkeletonCard />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Semi-protected: authenticated but may not have TOTP */}
        <Route path="/setup-2fa" element={
          <ProtectedRoute>
            <Setup2FA />
          </ProtectedRoute>
        } />

        {/* Protected */}
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"              element={<Dashboard />} />
          <Route path="/transactions"           element={<Transactions />} />
          <Route path="/transactions/new"       element={<NewTransaction />} />
          <Route path="/transactions/confirm"   element={<ConfirmTransaction />} />

          <Route path="/notifications" element={
            <Suspense fallback={<PageLoader />}>
              <Notifications />
            </Suspense>
          } />

          <Route path="/users" element={
            <PermissionGuard permission="MANAGE_USERS">
              <Suspense fallback={<PageLoader />}><Users /></Suspense>
            </PermissionGuard>
          } />

          <Route path="/zones" element={
            <PermissionGuard permission="MANAGE_ZONES">
              <Suspense fallback={<PageLoader />}><Zones /></Suspense>
            </PermissionGuard>
          } />

          <Route path="/rates" element={
            <PermissionGuard permission="MANAGE_RATES">
              <Suspense fallback={<PageLoader />}><Rates /></Suspense>
            </PermissionGuard>
          } />

          <Route path="/reports" element={
            <PermissionGuard permission="GENERATE_REPORTS">
              <Suspense fallback={<PageLoader />}><Reports /></Suspense>
            </PermissionGuard>
          } />

          <Route path="/audit" element={
            <PermissionGuard permission="VIEW_AUDIT_LOGS">
              <Suspense fallback={<PageLoader />}><AuditLogs /></Suspense>
            </PermissionGuard>
          } />

          <Route path="/profile" element={
            <Suspense fallback={<PageLoader />}><Profile /></Suspense>
          } />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
