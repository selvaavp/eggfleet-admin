import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import queryClient from '@/lib/queryClient';
import { useAuthStore } from '@/store/auth.store';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { AppLayout } from '@/components/layout/AppLayout';
import LoginPage from '@/pages/auth/LoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import VendorsPage from '@/pages/vendors/VendorsPage';
import VendorDetailPage from '@/pages/vendors/VendorDetailPage';
import InventoryPage from '@/pages/inventory/InventoryPage';
import DamagedEggsPage from '@/pages/inventory/DamagedEggsPage';
import RoutesPage from '@/pages/routes/RoutesPage';
import StoresPage from '@/pages/stores/StoresPage';
import StoreDetailPage from '@/pages/stores/StoreDetailPage';
import VansPage from '@/pages/vans/VansPage';
import AssignmentsPage from '@/pages/assignments/AssignmentsPage';
import EmployeesPage from '@/pages/employees/EmployeesPage';
import EmployeeDetailPage from '@/pages/employees/EmployeeDetailPage';
import HandoversPage from '@/pages/handovers/HandoversPage';
import PaymentsPage from '@/pages/payments/PaymentsPage';
import ExpensesPage from '@/pages/expenses/ExpensesPage';

function ProtectedRoute() {
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function PublicRoute() {
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function PushNotificationsRegistrar() {
  useAdminNotifications();
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PushNotificationsRegistrar />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/vendors/:id" element={<VendorDetailPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/inventory/damaged-eggs" element={<DamagedEggsPage />} />
              <Route path="/routes" element={<RoutesPage />} />
              <Route path="/stores" element={<StoresPage />} />
              <Route path="/stores/:id" element={<StoreDetailPage />} />
              <Route path="/vans" element={<VansPage />} />
              <Route path="/assignments" element={<AssignmentsPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/employees/:id" element={<EmployeeDetailPage />} />
              <Route path="/handovers" element={<HandoversPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            borderRadius: '10px',
            background: '#FFFFFF',
            color: '#212121',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          },
          success: { iconTheme: { primary: '#0D9488', secondary: '#FFFFFF' } },
          error: { iconTheme: { primary: '#BA1A1A', secondary: '#FFFFFF' } },
        }}
      />
    </QueryClientProvider>
  );
}
