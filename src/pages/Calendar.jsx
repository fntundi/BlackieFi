import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, CreditCard } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { data: recurringTransactions = [] } = useQuery({
    queryKey: ['recurring-calendar'],
    queryFn: () => base44.entities.RecurringTransaction.filter({ is_active: true }),
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['debts-calendar'],
    queryFn: () => base44.entities.Debt.filter({ is_active: true }),
  });

  const getEventsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const events = [];

    recurringTransactions.forEach(rt => {
      if (rt.next_date === dateStr) {
        events.push({
          type: rt.type,
          name: rt.name,
          amount: rt.amount,
          category: 'recurring',
        });
      }
    });

    debts.forEach(debt => {
      if (debt.next_payment_date === dateStr) {
        events.push({
          type: 'expense',
          name: `${debt.name} Payment`,
          amount: debt.minimum_payment,
          category: 'debt',
        });
      }
    });

    return events;
  };

  const getDayEvents = (date) => {
    if (!isSameMonth(date, currentDate)) return [];
    return getEventsForDate(date);
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Financial Calendar</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{format(currentDate, 'MMMM yyyy')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-gray-50 p-2 text-center font-semibold text-sm text-gray-600">
                  {day}
                </div>
              ))}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-white min-h-24" />
              ))}
              {daysInMonth.map(date => {
                const events = getDayEvents(date);
                const isToday = isSameDay(date, new Date());
                const isSelected = selectedDate && isSameDay(date, selectedDate);

                return (
                  <div
                    key={date.toISOString()}
                    className={`bg-white min-h-24 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isToday ? 'ring-2 ring-amber-500' : ''
                    } ${isSelected ? 'bg-amber-50' : ''}`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-amber-600 font-bold' : 'text-gray-900'}`}>
                      {format(date, 'd')}
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 2).map((event, idx) => (
                        <div
                          key={idx}
                          className={`text-xs p-1 rounded truncate ${
                            event.type === 'income'
                              ? 'bg-green-100 text-green-700'
                              : event.category === 'debt'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {event.name}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-xs text-gray-500 pl-1">
                          +{events.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle>Events on {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getEventsForDate(selectedDate).map((event, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {event.type === 'income' ? (
                        <ArrowUpCircle className="w-5 h-5 text-green-600" />
                      ) : event.category === 'debt' ? (
                        <CreditCard className="w-5 h-5 text-orange-600" />
                      ) : (
                        <ArrowDownCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{event.name}</p>
                        <Badge variant={event.type === 'income' ? 'default' : 'secondary'} className="mt-1">
                          {event.category === 'debt' ? 'Debt Payment' : event.type}
                        </Badge>
                      </div>
                    </div>
                    <div className={`font-semibold text-lg ${
                      event.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {event.type === 'income' ? '+' : '-'}${event.amount?.toFixed(2)}
                    </div>
                  </div>
                ))}
                {getEventsForDate(selectedDate).length === 0 && (
                  <p className="text-center text-gray-500 py-4">No events on this date</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}