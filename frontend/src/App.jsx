import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EntityProvider } from './contexts/EntityContext';
import { Toaster } from 'sonner';

import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import Debts from './pages/Debts';
import Investments from './pages/Investments';
import Assets from './pages/Assets';
import Goals from './pages/Goals';
import Entities from './pages/Entities';
import Settings from './pages/Settings';
import AdminSettings from './pages/AdminSettings';
import Calendar from './pages/Calendar';
import Reports from './pages/Reports';
import Import from './pages/Import';
import TaxPlanning from './pages/TaxPlanning';
import Groups from './pages/Groups';
import FinancialSettings from './pages/FinancialSettings';
import Notifications from './pages/Notifications';
import AICoPilot from './pages/AICoPilot';

import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050505' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center animate-pulse" style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F9F1D8 50%, #997B19 100%)'
          }}>
          </div>
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{
            borderColor: 'rgba(212, 175, 55, 0.2)',
            borderTopColor: '#D4AF37'
          }}></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/debts" element={<Debts />} />
                <Route path="/investments" element={<Investments />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/entities" element={<Entities />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/import" element={<Import />} />
                <Route path="/tax-planning" element={<TaxPlanning />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/financial-settings" element={<FinancialSettings />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/ai-copilot" element={<AICoPilot />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EntityProvider>
          <Router>
            <AppRoutes />
          </Router>
          <Toaster position="top-right" richColors />
        </EntityProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
