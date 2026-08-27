import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { AuthGuard, SuperAdminGuard, PublicOnlyGuard, TabletGuard } from '@/components/guards/RouteGuards';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'));
const HelpCenter = lazy(() => import('@/pages/help/HelpCenter'));

const SuperAdminLayout = lazy(() => import('@/layouts/SuperAdminLayout'));
const AdminLayout = lazy(() => import('@/layouts/AdminLayout'));
const PosLayout = lazy(() => import('@/layouts/PosLayout'));
const KdsLayout = lazy(() => import('@/layouts/KdsLayout'));
const TabletLayout = lazy(() => import('@/layouts/TabletLayout'));

const SuperAdminDashboard = lazy(() => import('@/pages/super-admin/Dashboard'));
const SuperAdminTenants = lazy(() => import('@/pages/super-admin/Tenants'));
const SuperAdminSalesReps = lazy(() => import('@/pages/super-admin/SalesReps'));
const SuperAdminFinancials = lazy(() => import('@/pages/super-admin/Financials'));
const SuperAdminAdmins = lazy(() => import('@/pages/super-admin/Admins'));
const SuperAdminUsers = lazy(() => import('@/pages/super-admin/PlatformUsers'));
const SuperAdminSubscriptions = lazy(() => import('@/pages/super-admin/Subscriptions'));
const SuperAdminRoles = lazy(() => import('@/pages/super-admin/Roles'));
const SuperAdminAudit = lazy(() => import('@/pages/super-admin/Audit'));
const SuperAdminPerformance = lazy(() => import('@/pages/super-admin/Performance'));
const SuperAdminAnalytics = lazy(() => import('@/pages/super-admin/Analytics'));
const SuperAdminSupport = lazy(() => import('@/pages/super-admin/Support'));
const SuperAdminApi = lazy(() => import('@/pages/super-admin/Api'));
const SuperAdminReport = lazy(() => import('@/pages/super-admin/Report'));
const SuperAdminSettingsPage = lazy(() => import('@/pages/super-admin/PlatformSettings'));
const SuperAdminNotifications = lazy(() => import('@/pages/super-admin/Notifications'));

const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminMenu = lazy(() => import('@/pages/admin/Menu'));
const AdminIntegrations = lazy(() => import('@/pages/admin/Integrations'));
const AdminOrders = lazy(() => import('@/pages/admin/Orders'));
const AdminStaff = lazy(() => import('@/pages/admin/Staff'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings'));
const AdminReports = lazy(() => import('@/pages/admin/Reports'));

const PosTerminal = lazy(() => import('@/pages/pos/PosTerminal'));
const KdsView = lazy(() => import('@/pages/kds/KdsView'));
const TabletMenu = lazy(() => import('@/pages/tablet/TabletMenu'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="animate-spin w-10 h-10 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-primary)' }} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth/login" element={<PublicOnlyGuard><LoginPage /></PublicOnlyGuard>} />
              <Route path="/auth/signup" element={<PublicOnlyGuard><SignupPage /></PublicOnlyGuard>} />
              <Route path="/help/*" element={<HelpCenter />} />

              <Route path="/app/tablet" element={<TabletGuard><TabletLayout /></TabletGuard>}>
                <Route index element={<TabletMenu />} />
              </Route>

              <Route path="/app/super-admin" element={<SuperAdminGuard><SuperAdminLayout /></SuperAdminGuard>}>
                <Route index element={<SuperAdminDashboard />} />
                <Route path="tenants" element={<SuperAdminTenants />} />
                <Route path="sales-reps" element={<SuperAdminSalesReps />} />
                <Route path="financials" element={<SuperAdminFinancials />} />
                <Route path="admins" element={<SuperAdminAdmins />} />
                <Route path="users" element={<SuperAdminUsers />} />
                <Route path="subscriptions" element={<SuperAdminSubscriptions />} />
                <Route path="roles" element={<SuperAdminRoles />} />
                <Route path="audit" element={<SuperAdminAudit />} />
                <Route path="performance" element={<SuperAdminPerformance />} />
                <Route path="analytics" element={<SuperAdminAnalytics />} />
                <Route path="support" element={<SuperAdminSupport />} />
                <Route path="api" element={<SuperAdminApi />} />
                <Route path="report" element={<SuperAdminReport />} />
                <Route path="settings" element={<SuperAdminSettingsPage />} />
                <Route path="notifications" element={<SuperAdminNotifications />} />
              </Route>

              <Route path="/app/admin" element={<AuthGuard><AdminLayout /></AuthGuard>}>
                <Route index element={<AdminDashboard />} />
                <Route path="menu" element={<AdminMenu />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="staff" element={<AdminStaff />} />
                <Route path="integrations" element={<AdminIntegrations />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              <Route path="/app/pos" element={<AuthGuard><PosLayout /></AuthGuard>}>
                <Route index element={<PosTerminal />} />
              </Route>

              <Route path="/app/kds" element={<AuthGuard><KdsLayout /></AuthGuard>}>
                <Route index element={<KdsView />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
