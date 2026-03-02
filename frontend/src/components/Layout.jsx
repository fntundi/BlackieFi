import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useEntity } from '../contexts/EntityContext';
import {
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
  Crown,
  Cpu,
  Calendar,
  FileText,
  Upload,
  Calculator,
  Users,
  Sliders,
  Bell,
  Brain
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/ai-copilot', icon: Brain, label: 'AI Co-Pilot', highlight: true },
  { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { path: '/accounts', icon: Wallet, label: 'Accounts' },
  { path: '/categories', icon: Tags, label: 'Categories' },
  { path: '/budgets', icon: PieChart, label: 'Budgets' },
  { path: '/debts', icon: CreditCard, label: 'Debts' },
  { path: '/investments', icon: LineChart, label: 'Investments' },
  { path: '/assets', icon: Package, label: 'Assets' },
  { path: '/goals', icon: Target, label: 'Goals' },
  { path: '/entities', icon: Building2, label: 'Entities' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/import', icon: Upload, label: 'Import' },
  { path: '/tax-planning', icon: Calculator, label: 'Tax Planning' },
  { path: '/notifications', icon: Bell, label: 'Notifications', showBadge: true },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { selectedEntityId, selectEntity } = useEntity();
  const location = useLocation();

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.getUnreadCount(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = unreadData?.unread_count || 0;

  React.useEffect(() => {
    if (entities.length > 0 && !selectedEntityId) {
      selectEntity(entities[0].id);
    }
  }, [entities, selectedEntityId, selectEntity]);

  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#050505' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '260px',
        minWidth: '260px',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)',
        borderRight: '1px solid rgba(212, 175, 55, 0.1)'
      }}>
        {/* Logo */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #D4AF37 0%, #F9F1D8 50%, #997B19 100%)'
            }}>
              <Crown style={{ width: '20px', height: '20px', color: '#000' }} />
            </div>
            <div>
              <span style={{ 
                fontSize: '1.25rem', 
                fontWeight: '700',
                background: 'linear-gradient(135deg, #F9F1D8 0%, #D4AF37 50%, #F9F1D8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>BlackieFi</span>
              <p style={{ fontSize: '0.625rem', color: '#525252', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>Premium Finance</p>
            </div>
          </Link>
        </div>

        {/* Entity Selector */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
          <label style={{ fontSize: '0.625rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37' }}>Entity</label>
          <div style={{ position: 'relative', marginTop: '0.75rem' }}>
            <select
              value={selectedEntityId || ''}
              onChange={(e) => selectEntity(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 2.5rem 0.75rem 1rem',
                appearance: 'none',
                cursor: 'pointer',
                borderRadius: '8px',
                background: 'rgba(212, 175, 55, 0.05)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                color: '#F5F5F5',
                fontSize: '0.875rem',
                outline: 'none'
              }}
              data-testid="entity-selector"
            >
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id} style={{ background: '#0A0A0A' }}>
                  {entity.name}
                </option>
              ))}
            </select>
            <ChevronDown style={{ 
              position: 'absolute', 
              right: '0.75rem', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              width: '16px', 
              height: '16px',
              color: '#D4AF37',
              pointerEvents: 'none'
            }} />
          </div>
          {selectedEntity && (
            <span style={{ fontSize: '0.75rem', color: '#525252', marginTop: '0.5rem', display: 'block', textTransform: 'capitalize' }}>
              {selectedEntity.type}
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
          <p style={{ fontSize: '0.625rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#404040', marginBottom: '1rem', paddingLeft: '0.75rem' }}>Navigation</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              const showBadge = item.showBadge && unreadCount > 0;
              const isHighlight = item.highlight;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    background: isActive 
                      ? 'rgba(212, 175, 55, 0.1)' 
                      : isHighlight 
                        ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.03) 100%)'
                        : 'transparent',
                    borderLeft: isActive ? '2px solid #D4AF37' : '2px solid transparent',
                    color: isActive ? '#D4AF37' : isHighlight ? '#D4AF37' : '#A3A3A3',
                    border: isHighlight && !isActive ? '1px solid rgba(212, 175, 55, 0.15)' : undefined,
                  }}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div style={{ position: 'relative' }}>
                    <Icon style={{ 
                      width: '18px', 
                      height: '18px', 
                      color: isActive ? '#D4AF37' : isHighlight ? '#D4AF37' : '#525252',
                      filter: isHighlight ? 'drop-shadow(0 0 4px rgba(212, 175, 55, 0.4))' : undefined
                    }} />
                    {showBadge && (
                      <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#DC2626',
                        border: '2px solid #0A0A0A'
                      }} />
                    )}
                  </div>
                  <span style={{ fontWeight: isHighlight ? '600' : '500', fontSize: '0.875rem', flex: 1 }}>{item.label}</span>
                  {showBadge && (
                    <span style={{
                      fontSize: '0.625rem',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '999px',
                      background: 'rgba(220, 38, 38, 0.2)',
                      color: '#DC2626',
                      fontWeight: '600'
                    }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                  {isActive && !showBadge && (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D4AF37' }}></div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(212, 175, 55, 0.1)' }}>
          {/* Admin Links - Only show for admins */}
          {user?.role === 'admin' && (
            <>
              <div style={{ fontSize: '0.625rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
                Admin
              </div>
              <Link
                to="/admin/settings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  marginBottom: '0.25rem',
                  background: location.pathname === '/admin/settings' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  borderLeft: location.pathname === '/admin/settings' ? '2px solid #D4AF37' : '2px solid transparent',
                  color: location.pathname === '/admin/settings' ? '#D4AF37' : '#A3A3A3'
                }}
                data-testid="nav-admin-settings"
              >
                <Cpu style={{ width: '18px', height: '18px', color: location.pathname === '/admin/settings' ? '#D4AF37' : '#525252' }} />
                <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>AI Config</span>
              </Link>
              <Link
                to="/groups"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  marginBottom: '0.25rem',
                  background: location.pathname === '/groups' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  borderLeft: location.pathname === '/groups' ? '2px solid #D4AF37' : '2px solid transparent',
                  color: location.pathname === '/groups' ? '#D4AF37' : '#A3A3A3'
                }}
                data-testid="nav-groups"
              >
                <Users style={{ width: '18px', height: '18px', color: location.pathname === '/groups' ? '#D4AF37' : '#525252' }} />
                <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Groups</span>
              </Link>
              <Link
                to="/financial-settings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  marginBottom: '0.5rem',
                  background: location.pathname === '/financial-settings' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  borderLeft: location.pathname === '/financial-settings' ? '2px solid #D4AF37' : '2px solid transparent',
                  color: location.pathname === '/financial-settings' ? '#D4AF37' : '#A3A3A3'
                }}
                data-testid="nav-financial-settings"
              >
                <Sliders style={{ width: '18px', height: '18px', color: location.pathname === '/financial-settings' ? '#D4AF37' : '#525252' }} />
                <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Fin. Settings</span>
              </Link>
            </>
          )}

          <Link
            to="/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              textDecoration: 'none',
              color: '#A3A3A3'
            }}
            data-testid="nav-settings"
          >
            <Settings style={{ width: '18px', height: '18px', color: '#525252' }} />
            <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Settings</span>
          </Link>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            marginTop: '0.75rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.15)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #D4AF37 0%, #997B19 100%)'
            }}>
              <User style={{ width: '20px', height: '20px', color: '#000' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#F5F5F5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name || user?.username}</p>
              <p style={{ fontSize: '0.75rem', color: '#525252', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              marginTop: '0.75rem',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#DC2626'
            }}
            data-testid="logout-btn"
          >
            <LogOut style={{ width: '18px', height: '18px' }} />
            <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', background: '#050505' }}>
        {children}
      </main>
    </div>
  );
}
