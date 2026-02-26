import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import {
  TrendingUp,
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Tags,
  PieChart,
  CreditCard,
  LineChart,
  Package,
  Target,
  Building2,
  Settings,
  LogOut,
  ChevronDown,
  User
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { path: '/accounts', icon: Wallet, label: 'Accounts' },
  { path: '/categories', icon: Tags, label: 'Categories' },
  { path: '/budgets', icon: PieChart, label: 'Budgets' },
  { path: '/debts', icon: CreditCard, label: 'Debts' },
  { path: '/investments', icon: LineChart, label: 'Investments' },
  { path: '/assets', icon: Package, label: 'Assets' },
  { path: '/goals', icon: Target, label: 'Goals' },
  { path: '/entities', icon: Building2, label: 'Entities' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { selectedEntityId, selectEntity } = useEntity();
  const location = useLocation();

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  // Auto-select first entity if none selected
  React.useEffect(() => {
    if (entities.length > 0 && !selectedEntityId) {
      selectEntity(entities[0].id);
    }
  }, [entities, selectedEntityId, selectEntity]);

  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  return (
    <div className="flex min-h-screen bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-500" />
            <span className="text-xl font-bold text-white">BlackieFi</span>
          </Link>
        </div>

        {/* Entity Selector */}
        <div className="p-4 border-b border-slate-800">
          <label className="text-xs text-slate-500 uppercase tracking-wide">Entity</label>
          <div className="relative mt-2">
            <select
              value={selectedEntityId || ''}
              onChange={(e) => selectEntity(e.target.value)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg py-2 px-3 pr-8 appearance-none cursor-pointer hover:border-slate-600 focus:outline-none focus:border-emerald-500"
              data-testid="entity-selector"
            >
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          {selectedEntity && (
            <span className="text-xs text-slate-500 mt-1 block capitalize">
              {selectedEntity.type}
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-500 border-l-2 border-emerald-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}          
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-800">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            data-testid="nav-settings"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </Link>
          
          <div className="flex items-center gap-3 px-4 py-3 mt-2">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || user?.username}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all mt-2"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
