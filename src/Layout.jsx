import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Building2, 
  ArrowLeftRight, 
  Repeat, 
  CreditCard, 
  TrendingUp,
  Tag,
  Calendar,
  Upload,
  Menu,
  X,
  LogOut,
  BarChart3,
  PiggyBank,
  Settings,
  Users,
  Package,
  Wallet,
  DollarSign,
  Receipt,
  Bell,
  FileDown,
  History,
  Bot,
  FileQuestion,
  CalendarClock
} from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const navigation = [
    { name: 'Dashboard', href: createPageUrl('Dashboard'), icon: LayoutDashboard },
    { name: 'Accounts', href: createPageUrl('Accounts'), icon: Wallet },
    { name: 'Income', href: createPageUrl('Income'), icon: DollarSign },
    { name: 'Expenses', href: createPageUrl('Expenses'), icon: Receipt },
    { name: 'Entities', href: createPageUrl('Entities'), icon: Building2 },
    { name: 'Multi-Entity', href: createPageUrl('CrossEntity'), icon: Building2 },
    { name: 'Transactions', href: createPageUrl('Transactions'), icon: ArrowLeftRight },
    { name: 'Recurring', href: createPageUrl('RecurringTransactions'), icon: Repeat },
    { name: 'Bill Pay', href: createPageUrl('BillPay'), icon: CalendarClock },
    { name: 'Budgets', href: createPageUrl('Budgets'), icon: PiggyBank },
    { name: 'Budget Variance', href: createPageUrl('BudgetVariance'), icon: BarChart3 },
    { name: 'Goals', href: createPageUrl('FinancialGoals'), icon: TrendingUp },
    { name: 'Debts', href: createPageUrl('Debts'), icon: CreditCard },
    { name: 'Debt Payoff', href: createPageUrl('DebtPayoff'), icon: CreditCard },
    { name: 'Investments', href: createPageUrl('Investments'), icon: TrendingUp },
    { name: 'Portfolio Analytics', href: createPageUrl('PortfolioAnalytics'), icon: BarChart3 },
    { name: 'Inventory', href: createPageUrl('Inventory'), icon: Package },
    { name: 'Assets', href: createPageUrl('Assets'), icon: Building2 },
    { name: 'Tax Planning', href: createPageUrl('TaxPlanning'), icon: BarChart3 },
    { name: 'AI Assistant', href: createPageUrl('AIAssistant'), icon: Bot },
    { name: 'Document Q&A', href: createPageUrl('DocumentQA'), icon: FileQuestion },
    { name: 'Notifications', href: createPageUrl('Notifications'), icon: Bell },
    { name: 'Categories', href: createPageUrl('Categories'), icon: Tag },
    { name: 'Calendar', href: createPageUrl('Calendar'), icon: Calendar },
    { name: 'Import', href: createPageUrl('Import'), icon: Upload },
    { name: 'Data Management', href: createPageUrl('DataManagement'), icon: Upload },
    { name: 'Reports', href: createPageUrl('Reports'), icon: BarChart3 },
    { name: 'PDF Export', href: createPageUrl('PDFExport'), icon: FileDown },
    { name: 'Audit Log', href: createPageUrl('AuditLog'), icon: History },
    ...(user?.role === 'admin' ? [
      { name: 'Settings Hub', href: createPageUrl('Settings'), icon: Settings },
      { name: 'Settings', href: createPageUrl('FinancialSettings'), icon: Settings },
      { name: 'Groups', href: createPageUrl('Groups'), icon: Users }
    ] : []),
  ];

  const isActive = (href) => {
    return location.pathname === href || location.pathname === href + '/';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        :root {
          --color-primary: #F59E0B;
          --color-secondary: #1E40AF;
          --color-dark: #0F172A;
          --color-accent: #FBBF24;
        }
      `}</style>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-blue-800 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">BF</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">BlackieFi</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-white z-40 pt-16 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-amber-500 to-blue-800 text-white shadow-lg font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-gray-200">
            <div className="mb-3">
              <p className="text-sm text-gray-600">{user?.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-slate-900 border-r border-slate-800 overflow-y-auto">
          <div className="flex items-center gap-3 p-6 border-b border-slate-800">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold">BF</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">BlackieFi</h1>
              <p className="text-xs text-gray-400">Financial Tracker</p>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-amber-500 to-blue-800 text-white shadow-lg font-semibold'
                      : 'text-gray-300 hover:bg-slate-800 hover:text-amber-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-slate-800">
            <div className="mb-3">
              <p className="text-sm font-medium text-white">{user?.full_name}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
              <p className="text-xs text-amber-400 capitalize mt-1">{user?.role}</p>
            </div>
            <Button variant="outline" className="w-full bg-slate-800 border-slate-700 text-gray-300 hover:bg-slate-700 hover:text-amber-400" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 pt-16 lg:pt-0">
        {children}
      </div>
    </div>
  );
}
