'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Tags, PieChart,
  CreditCard, LineChart, Package, Target, Building2, Settings,
  LogOut, ChevronDown, User, Crown, Cpu, Calendar, FileText,
  Upload, Calculator, Users, Sliders, Bell, Brain, Shield, TrendingUp
} from 'lucide-react';

interface SidebarProps {
  children: React.ReactNode;
}

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { href: '/accounts', icon: Wallet, label: 'Accounts' },
  { href: '/entities', icon: Building2, label: 'Entities' },
  { href: '/budgets', icon: PieChart, label: 'Budgets' },
  { href: '/goals', icon: Target, label: 'Goals' },
  { href: '/debts', icon: CreditCard, label: 'Debts' },
  { href: '/investments', icon: LineChart, label: 'Investments' },
  { href: '/assets', icon: Package, label: 'Assets' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/reports', icon: FileText, label: 'Reports' },
  { href: '/import', icon: Upload, label: 'Import' },
  { href: '/tax', icon: Calculator, label: 'Tax Planning' },
  { href: '/ai-copilot', icon: Brain, label: 'AI Co-Pilot' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
];

const adminItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/groups', icon: Users, label: 'Groups' },
  { href: '/system-admin', icon: Shield, label: 'System Admin' },
  { href: '/market-data', icon: TrendingUp, label: 'Market Data' },
];

export default function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-[#D4AF37]" />
            <span className="text-xl font-bold text-white">BlackieFi</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#D4AF37]' : 'text-gray-500'}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Admin Section */}
          {isAdmin && (
            <>
              <div className="pt-4 pb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4">
                  Admin
                </span>
              </div>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#D4AF37]' : 'text-gray-500'}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
              <User className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.full_name || user?.username}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
