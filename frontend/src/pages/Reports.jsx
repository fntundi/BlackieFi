import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  DollarSign,
  Percent,
  Filter,
  Loader2
} from 'lucide-react';

const REPORT_TYPES = [
  { id: 'profit_loss', name: 'Profit & Loss', icon: TrendingUp, description: 'Income vs expenses analysis' },
  { id: 'balance_sheet', name: 'Balance Sheet', icon: DollarSign, description: 'Assets, liabilities, and equity' },
  { id: 'cash_flow', name: 'Cash Flow', icon: BarChart3, description: 'Money in and out over time' },
  { id: 'budget_vs_actual', name: 'Budget vs Actual', icon: PieChart, description: 'Compare planned vs actual spending' },
];

export default function Reports() {
  const [selectedEntity, setSelectedEntity] = useState('');
  const [reportType, setReportType] = useState('profit_loss');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) {
      setSelectedEntity(entities[0].id);
    }
  }, [entities, selectedEntity]);

  const generateReport = async () => {
    if (!selectedEntity) return;
    
    setLoading(true);
    try {
      const result = await api.generateReport(reportType, selectedEntity, startDate, endDate);
      setReportData(result);
      toast.success('Report generated');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!reportData) return;
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${startDate}-to-${endDate}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
    toast.success('Report downloaded');
  };

  const cardStyle = {
    padding: '1.5rem',
    borderRadius: '16px',
    background: '#0A0A0A',
    border: '1px solid rgba(212, 175, 55, 0.1)'
  };

  const inputStyle = {
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    background: '#0F0F0F',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#F5F5F5',
    width: '100%'
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="reports-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Analytics</p>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Financial Reports</h1>
          <p style={{ marginTop: '0.5rem', color: '#525252' }}>Generate detailed financial reports and insights</p>
        </div>

        {/* Report Type Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {REPORT_TYPES.map(type => {
            const Icon = type.icon;
            const isSelected = reportType === type.id;
            
            return (
              <button
                key={type.id}
                onClick={() => setReportType(type.id)}
                style={{
                  ...cardStyle,
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: isSelected ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                  background: isSelected ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, #0A0A0A 100%)' : '#0A0A0A',
                  transition: 'all 0.2s'
                }}
                data-testid={`report-type-${type.id}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <Icon style={{ width: '24px', height: '24px', color: isSelected ? '#D4AF37' : '#525252' }} />
                  <span style={{ fontWeight: '600', color: isSelected ? '#F5F5F5' : '#A3A3A3' }}>{type.name}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#525252', margin: 0 }}>{type.description}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div style={{ ...cardStyle, marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Filter style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>Report Filters</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Entity</label>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                style={inputStyle}
                data-testid="entity-select"
              >
                {entities.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={inputStyle}
                data-testid="start-date"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', marginBottom: '0.5rem' }}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={inputStyle}
                data-testid="end-date"
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={generateReport}
                disabled={loading || !selectedEntity}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #C4A030 0%, #D4AF37 50%, #C4A030 100%)',
                  color: '#000',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                data-testid="generate-report-btn"
              >
                {loading ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : <FileText style={{ width: '16px', height: '16px' }} />}
                Generate
              </button>
              {reportData && (
                <button
                  onClick={downloadReport}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    cursor: 'pointer'
                  }}
                  title="Download Report"
                >
                  <Download style={{ width: '16px', height: '16px', color: '#D4AF37' }} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report Results */}
        {reportData && (
          <div style={cardStyle}>
            {reportType === 'profit_loss' && <ProfitLossReport data={reportData.report_data} />}
            {reportType === 'balance_sheet' && <BalanceSheetReport data={reportData.report_data} />}
            {reportType === 'cash_flow' && <CashFlowReport data={reportData.report_data} />}
            {reportType === 'budget_vs_actual' && <BudgetVsActualReport data={reportData.report_data} />}
          </div>
        )}

        {!reportData && !loading && (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '4rem' }}>
            <FileText style={{ width: '48px', height: '48px', color: '#525252', margin: '0 auto 1rem' }} />
            <p style={{ color: '#737373' }}>Select a report type and date range, then click "Generate" to create your report</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background: #0A0A0A; }
      `}</style>
    </div>
  );
}

// Profit & Loss Report Component
function ProfitLossReport({ data }) {
  if (!data) return null;
  
  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#D4AF37', marginBottom: '1.5rem' }}>Profit & Loss Statement</h3>
      
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <SummaryCard label="Total Income" value={data.total_income} color="#059669" />
        <SummaryCard label="Total Expenses" value={data.total_expenses} color="#DC2626" />
        <SummaryCard label="Net Income" value={data.net_income} color={data.net_income >= 0 ? '#059669' : '#DC2626'} />
        <SummaryCard label="Profit Margin" value={`${data.profit_margin?.toFixed(1)}%`} color="#D4AF37" isPercent />
      </div>

      {/* Income Breakdown */}
      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#059669', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Income by Category</h4>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {Object.entries(data.income || {}).map(([cat, amount]) => (
            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(5, 150, 105, 0.05)', borderRadius: '8px' }}>
              <span style={{ color: '#A3A3A3' }}>{cat}</span>
              <span style={{ color: '#059669', fontWeight: '600' }}>${amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Breakdown */}
      <div>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#DC2626', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expenses by Category</h4>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {Object.entries(data.expenses || {}).map(([cat, amount]) => (
            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(220, 38, 38, 0.05)', borderRadius: '8px' }}>
              <span style={{ color: '#A3A3A3' }}>{cat}</span>
              <span style={{ color: '#DC2626', fontWeight: '600' }}>${amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Balance Sheet Report Component
function BalanceSheetReport({ data }) {
  if (!data) return null;
  
  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#D4AF37', marginBottom: '1.5rem' }}>Balance Sheet</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <SummaryCard label="Total Assets" value={data.total_assets} color="#059669" />
        <SummaryCard label="Total Liabilities" value={data.total_liabilities} color="#DC2626" />
        <SummaryCard label="Net Equity" value={data.equity} color={data.equity >= 0 ? '#D4AF37' : '#DC2626'} />
        <SummaryCard label="Debt to Equity" value={`${data.debt_to_equity_ratio?.toFixed(2)}x`} color="#3B82F6" isPercent />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#059669', marginBottom: '1rem', textTransform: 'uppercase' }}>Assets</h4>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {Object.entries(data.assets || {}).map(([type, amount]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(5, 150, 105, 0.05)', borderRadius: '8px' }}>
                <span style={{ color: '#A3A3A3', textTransform: 'capitalize' }}>{type.replace(/_/g, ' ')}</span>
                <span style={{ color: '#059669', fontWeight: '600' }}>${amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#DC2626', marginBottom: '1rem', textTransform: 'uppercase' }}>Liabilities</h4>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {Object.entries(data.liabilities || {}).map(([type, amount]) => (
              <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(220, 38, 38, 0.05)', borderRadius: '8px' }}>
                <span style={{ color: '#A3A3A3', textTransform: 'capitalize' }}>{type.replace(/_/g, ' ')}</span>
                <span style={{ color: '#DC2626', fontWeight: '600' }}>${amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Cash Flow Report Component
function CashFlowReport({ data }) {
  if (!data) return null;
  
  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#D4AF37', marginBottom: '1.5rem' }}>Cash Flow Statement</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <SummaryCard label="Cash In" value={data.total_cash_in} color="#059669" />
        <SummaryCard label="Cash Out" value={data.total_cash_out} color="#DC2626" />
        <SummaryCard label="Net Cash Flow" value={data.net_cash_flow} color={data.net_cash_flow >= 0 ? '#D4AF37' : '#DC2626'} />
      </div>

      <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#F5F5F5', marginBottom: '1rem', textTransform: 'uppercase' }}>Monthly Cash Flow</h4>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {Object.entries(data.monthly_cash_flow || {}).map(([month, flow]) => (
          <div key={month} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', alignItems: 'center' }}>
            <span style={{ color: '#F5F5F5', fontWeight: '500' }}>{month}</span>
            <span style={{ color: '#059669' }}>+${flow.income?.toLocaleString()}</span>
            <span style={{ color: '#DC2626' }}>-${flow.expenses?.toLocaleString()}</span>
            <span style={{ color: flow.net >= 0 ? '#D4AF37' : '#DC2626', fontWeight: '600' }}>${flow.net?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Budget vs Actual Report Component
function BudgetVsActualReport({ data }) {
  if (!data) return null;
  
  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#D4AF37', marginBottom: '1.5rem' }}>Budget vs Actual</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <SummaryCard label="Total Budgeted" value={data.total_budgeted} color="#3B82F6" />
        <SummaryCard label="Total Actual" value={data.total_actual} color="#D4AF37" />
        <SummaryCard label="Variance" value={data.total_variance} color={data.total_variance >= 0 ? '#059669' : '#DC2626'} />
      </div>

      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '8px' }}>
          <span style={{ color: '#D4AF37', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase' }}>Category</span>
          <span style={{ color: '#D4AF37', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Budgeted</span>
          <span style={{ color: '#D4AF37', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Actual</span>
          <span style={{ color: '#D4AF37', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Variance</span>
          <span style={{ color: '#D4AF37', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>%</span>
        </div>
        {(data.categories || []).map((cat, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '1rem', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }}>
            <span style={{ color: '#F5F5F5' }}>{cat.category_name}</span>
            <span style={{ color: '#3B82F6', textAlign: 'right' }}>${cat.budgeted?.toLocaleString()}</span>
            <span style={{ color: '#D4AF37', textAlign: 'right' }}>${cat.actual?.toLocaleString()}</span>
            <span style={{ color: cat.variance >= 0 ? '#059669' : '#DC2626', textAlign: 'right' }}>${cat.variance?.toLocaleString()}</span>
            <span style={{ color: cat.variance_percent >= 0 ? '#059669' : '#DC2626', textAlign: 'right' }}>{cat.variance_percent?.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ label, value, color, isPercent = false }) {
  const displayValue = typeof value === 'number' && !isPercent ? `$${value.toLocaleString()}` : value;
  
  return (
    <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <p style={{ fontSize: '0.7rem', color: '#737373', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: '700', color, margin: 0 }}>{displayValue}</p>
    </div>
  );
}
