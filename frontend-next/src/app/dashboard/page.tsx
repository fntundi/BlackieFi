'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { 
  TrendingUp, TrendingDown, Wallet, CreditCard, 
  Target, PiggyBank, ArrowUpRight, ArrowDownRight,
  Loader2
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.getDashboardSummary(),
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <Sidebar>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.full_name || user?.username}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Worth */}
          <div className="stat-card-gold">
            <div className="gold-accent" />
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#D4AF37]/20">
                <Wallet className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Net Worth</p>
                <p className="text-xl font-bold text-white">
                  {isLoading ? '...' : formatCurrency(summary?.net_worth)}
                </p>
              </div>
            </div>
          </div>

          {/* Total Assets */}
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Assets</p>
                <p className="text-xl font-bold text-white">
                  {isLoading ? '...' : formatCurrency(summary?.total_assets)}
                </p>
              </div>
            </div>
          </div>

          {/* Total Liabilities */}
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <CreditCard className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Liabilities</p>
                <p className="text-xl font-bold text-white">
                  {isLoading ? '...' : formatCurrency(summary?.total_liabilities)}
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Savings */}
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <PiggyBank className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Monthly Savings</p>
                <p className="text-xl font-bold text-white">
                  {isLoading ? '...' : formatCurrency(summary?.monthly_savings)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expenses */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Income vs Expenses</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400">Income</span>
                </div>
                <span className="text-green-400 font-semibold">
                  {formatCurrency(summary?.monthly_income || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                  <span className="text-gray-400">Expenses</span>
                </div>
                <span className="text-red-400 font-semibold">
                  {formatCurrency(summary?.monthly_expenses || 0)}
                </span>
              </div>
              <div className="pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Net</span>
                  <span className={`font-semibold ${(summary?.monthly_income - summary?.monthly_expenses) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency((summary?.monthly_income || 0) - (summary?.monthly_expenses || 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Goals Progress */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Goals Progress</h2>
            {summary?.goals?.length > 0 ? (
              <div className="space-y-4">
                {summary.goals.slice(0, 3).map((goal: any) => (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-400">{goal.name}</span>
                      <span className="text-sm text-white">
                        {Math.round((goal.current_amount / goal.target_amount) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#D4AF37] rounded-full transition-all"
                        style={{ width: `${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No goals set yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
