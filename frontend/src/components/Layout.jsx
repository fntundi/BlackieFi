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
  User,
  Crown
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
    <div className="flex min-h-screen" style={{ background: '#050505' }}>
      {/* Sidebar */}
      <aside className="w-72 flex flex-col" style={{ 
        background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)',
        borderRight: '1px solid rgba(212, 175, 55, 0.1)'
      }}>
        {/* Logo */}
        <div className="p-6" style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #F9F1D8 50%, #997B19 100%)'
              }}>
                <Crown className="w-5 h-5 text-black" />
              </div>
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
                boxShadow: '0 0 20px rgba(212, 175, 55, 0.5)'
              }}></div>
            </div>
            <div>
              <span className="text-xl font-display font-bold" style={{
                background: 'linear-gradient(135deg, #F9F1D8 0%, #D4AF37 50%, #F9F1D8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>BlackieFi</span>
              <p className="text-xs text-zinc-500 tracking-widest uppercase">Premium Finance</p>
            </div>
          </Link>
        </div>

        {/* Entity Selector */}
        <div className="p-6" style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
          <label className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#D4AF37' }}>Entity</label>
          <div className="relative mt-3">
            <select
              value={selectedEntityId || ''}
              onChange={(e) => selectEntity(e.target.value)}
              className="w-full py-3 px-4 pr-10 appearance-none cursor-pointer rounded-lg transition-all duration-300 focus:outline-none"
              style={{
                background: 'rgba(212, 175, 55, 0.05)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                color: '#F5F5F5'
              }}
              data-testid="entity-selector"
            >
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id} style={{ background: '#0A0A0A' }}>
                  {entity.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#D4AF37' }} />
          </div>
          {selectedEntity && (
            <span className="text-xs mt-2 block capitalize" style={{ color: '#6E6E6E' }}>
              {selectedEntity.type}
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold tracking-widest uppercase mb-4 px-4" style={{ color: '#525252' }}>Navigation</p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group"
                style={{
                  background: isActive ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  borderLeft: isActive ? '2px solid #D4AF37' : '2px solid transparent',
                  color: isActive ? '#D4AF37' : '#A3A3A3'
                }}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className="w-5 h-5 transition-all duration-300" style={{
                  color: isActive ? '#D4AF37' : '#6E6E6E'
                }} />
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#D4AF37' }}></div>
                )}
              </Link>
            );
          })}          
        </nav>

        {/* User section */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(212, 175, 55, 0.1)' }}>
          <Link
            to="/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300"
            style={{ color: '#A3A3A3' }}
            data-testid="nav-settings"
          >
            <Settings className="w-5 h-5" style={{ color: '#6E6E6E' }} />
            <span className="font-medium text-sm">Settings</span>
          </Link>
          
          <div className="flex items-center gap-3 px-4 py-4 mt-3 rounded-xl" style={{
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.15)'
          }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #997B19 100%)'
            }}>
              <User className="w-5 h-5 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: '#F5F5F5' }}>{user?.full_name || user?.username}</p>
              <p className="text-xs truncate" style={{ color: '#6E6E6E' }}>{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 mt-3"
            style={{ color: '#DC2626' }}
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ background: '#050505' }}>
        {children}
      </main>
    </div>
  );
}
