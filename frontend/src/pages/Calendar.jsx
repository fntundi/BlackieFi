import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { toast } from 'sonner';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  RefreshCw,
  CreditCard,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEntity, setSelectedEntity] = useState('');
  
  const queryClient = useQueryClient();

  const { data: entities = [] } = useQuery({
    queryKey: ['entities'],
    queryFn: () => api.getEntities(),
  });

  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) {
      setSelectedEntity(entities[0].id);
    }
  }, [entities, selectedEntity]);

  const { data: recurring = [] } = useQuery({
    queryKey: ['recurring', selectedEntity],
    queryFn: () => api.getRecurringTransactions({ entity_id: selectedEntity }),
    enabled: !!selectedEntity,
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['debts', selectedEntity],
    queryFn: () => api.getDebts(selectedEntity),
    enabled: !!selectedEntity,
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills', selectedEntity],
    queryFn: () => api.getBills(selectedEntity),
    enabled: !!selectedEntity,
  });

  // Get calendar data
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build events from recurring transactions, debts, and bills
  const events = {};
  
  recurring.forEach(r => {
    if (r.next_date) {
      const day = parseInt(r.next_date.split('-')[2]);
      const eventMonth = parseInt(r.next_date.split('-')[1]) - 1;
      const eventYear = parseInt(r.next_date.split('-')[0]);
      
      if (eventYear === year && eventMonth === month) {
        if (!events[day]) events[day] = [];
        events[day].push({
          type: r.type,
          name: r.name,
          amount: r.amount,
          eventType: 'recurring'
        });
      }
    }
  });

  debts.forEach(d => {
    if (d.next_payment_date) {
      const day = parseInt(d.next_payment_date.split('-')[2]);
      const eventMonth = parseInt(d.next_payment_date.split('-')[1]) - 1;
      const eventYear = parseInt(d.next_payment_date.split('-')[0]);
      
      if (eventYear === year && eventMonth === month) {
        if (!events[day]) events[day] = [];
        events[day].push({
          type: 'expense',
          name: d.name,
          amount: d.minimum_payment || 0,
          eventType: 'debt'
        });
      }
    }
  });

  bills.forEach(b => {
    if (b.due_date) {
      const day = parseInt(b.due_date.split('-')[2]);
      const eventMonth = parseInt(b.due_date.split('-')[1]) - 1;
      const eventYear = parseInt(b.due_date.split('-')[0]);
      
      if (eventYear === year && eventMonth === month) {
        if (!events[day]) events[day] = [];
        events[day].push({
          type: 'expense',
          name: b.name,
          amount: b.typical_amount,
          eventType: 'bill',
          status: b.status
        });
      }
    }
  });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const isToday = (day) => {
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  // Calculate monthly totals
  const monthlyIncome = Object.values(events).flat().filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const monthlyExpenses = Object.values(events).flat().filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);

  const cardStyle = {
    padding: '1.5rem',
    borderRadius: '16px',
    background: '#0A0A0A',
    border: '1px solid rgba(212, 175, 55, 0.1)'
  };

  return (
    <div style={{ padding: '2rem', background: '#050505', minHeight: '100%' }} data-testid="calendar-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.5rem' }}>Schedule</p>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#F5F5F5', margin: 0 }}>Financial Calendar</h1>
            <p style={{ marginTop: '0.5rem', color: '#525252' }}>Track recurring transactions, debt payments, and bills</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: '#0F0F0F',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#F5F5F5',
                minWidth: '180px'
              }}
              data-testid="entity-select"
            >
              {entities.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.1) 0%, #0A0A0A 100%)', border: '1px solid rgba(5, 150, 105, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <TrendingUp style={{ width: '20px', height: '20px', color: '#059669' }} />
              <span style={{ fontSize: '0.75rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Expected Income</span>
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669', margin: 0 }}>${monthlyIncome.toLocaleString()}</p>
          </div>
          
          <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, #0A0A0A 100%)', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <TrendingDown style={{ width: '20px', height: '20px', color: '#DC2626' }} />
              <span style={{ fontSize: '0.75rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Expected Expenses</span>
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#DC2626', margin: 0 }}>${monthlyExpenses.toLocaleString()}</p>
          </div>
          
          <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, #0A0A0A 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <DollarSign style={{ width: '20px', height: '20px', color: '#D4AF37' }} />
              <span style={{ fontSize: '0.75rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Net Cash Flow</span>
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: monthlyIncome - monthlyExpenses >= 0 ? '#059669' : '#DC2626', margin: 0 }}>
              ${(monthlyIncome - monthlyExpenses).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Calendar */}
        <div style={cardStyle}>
          {/* Calendar Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <button
              onClick={prevMonth}
              style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.1)', border: 'none', cursor: 'pointer' }}
            >
              <ChevronLeft style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#F5F5F5', margin: 0 }}>
              {MONTHS[month]} {year}
            </h2>
            <button
              onClick={nextMonth}
              style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.1)', border: 'none', cursor: 'pointer' }}
            >
              <ChevronRight style={{ width: '24px', height: '24px', color: '#D4AF37' }} />
            </button>
          </div>

          {/* Days Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {DAYS.map(day => (
              <div key={day} style={{ textAlign: 'center', padding: '0.75rem', color: '#737373', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
            {/* Empty cells for days before the first */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} style={{ minHeight: '100px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }} />
            ))}
            
            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = events[day] || [];
              const hasIncome = dayEvents.some(e => e.type === 'income');
              const hasExpense = dayEvents.some(e => e.type === 'expense');
              
              return (
                <div
                  key={day}
                  style={{
                    minHeight: '100px',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    background: isToday(day) ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: isToday(day) ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid transparent',
                    position: 'relative'
                  }}
                >
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    fontSize: '0.875rem',
                    fontWeight: isToday(day) ? '700' : '500',
                    color: isToday(day) ? '#D4AF37' : '#A3A3A3',
                    background: isToday(day) ? 'rgba(212, 175, 55, 0.2)' : 'transparent'
                  }}>
                    {day}
                  </span>
                  
                  {/* Event indicators */}
                  <div style={{ marginTop: '0.25rem' }}>
                    {dayEvents.slice(0, 3).map((event, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: '0.625rem',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '4px',
                          marginBottom: '0.125rem',
                          background: event.type === 'income' ? 'rgba(5, 150, 105, 0.2)' : 'rgba(220, 38, 38, 0.2)',
                          color: event.type === 'income' ? '#059669' : '#DC2626',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={`${event.name}: $${event.amount}`}
                      >
                        ${event.amount}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span style={{ fontSize: '0.625rem', color: '#737373' }}>+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'rgba(5, 150, 105, 0.3)' }} />
            <span style={{ fontSize: '0.75rem', color: '#737373' }}>Income</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'rgba(220, 38, 38, 0.3)' }} />
            <span style={{ fontSize: '0.75rem', color: '#737373' }}>Expense / Bill / Debt Payment</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.3)' }} />
            <span style={{ fontSize: '0.75rem', color: '#737373' }}>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
