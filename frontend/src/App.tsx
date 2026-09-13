import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { CustomerListPage } from './pages/customers/CustomerListPage.js';
import { CustomerDetailPage } from './pages/customers/CustomerDetailPage.js';
import { StockListPage } from './pages/stock/StockListPage.js';
import { SalesListPage } from './pages/sales/SalesListPage.js';
import { NewSalePage } from './pages/sales/NewSalePage.js';
import { SaleDetailPage } from './pages/sales/SaleDetailPage.js';
import { FinancePage } from './pages/finance/FinancePage.js';
import { ReportsPage } from './pages/reports/ReportsPage.js';
import { SettingsPage } from './pages/settings/SettingsPage.js';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'owner' }> = ({
  children,
  requiredRole,
}) => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm">
        Verifying authorization...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Customers */}
            <Route path="/customers" element={<CustomerListPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />

            {/* Sales & Invoices */}
            <Route path="/sales" element={<SalesListPage />} />
            <Route path="/sales/new" element={<NewSalePage />} />
            <Route path="/sales/:id" element={<SaleDetailPage />} />

            {/* Stock & Inventory */}
            <Route path="/stock" element={<StockListPage />} />

            {/* Finance (Strictly Owner Only) */}
            <Route
              path="/finance"
              element={
                <ProtectedRoute requiredRole="owner">
                  <FinancePage />
                </ProtectedRoute>
              }
            />

            {/* Reports */}
            <Route path="/reports" element={<ReportsPage />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback Redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
