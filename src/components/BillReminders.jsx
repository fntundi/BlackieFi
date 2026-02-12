import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, AlertCircle, Calendar, DollarSign, Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';

export default function BillReminders({ entityId, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [bills, setBills] = useState([]);

  React.useEffect(() => {
    loadBills();
  }, [entityId]);

  const loadBills = async () => {
    setLoading(true);
    try {
      const allBills = await base44.entities.Bill.filter({ entity_id: entityId });
      const today = new Date();
      
      // Update status based on due date
      const updatedBills = allBills.map(bill => {
        const dueDate = parseISO(bill.due_date);
        const daysUntilDue = differenceInDays(dueDate, today);
        
        let status = bill.status;
        if (status !== 'paid') {
          if (daysUntilDue < 0) {
            status = 'overdue';
          } else if (daysUntilDue <= bill.reminder_days) {
            status = 'upcoming';
          }
        }
        
        return { ...bill, status, daysUntilDue };
      });

      setBills(updatedBills.sort((a, b) => a.daysUntilDue - b.daysUntilDue));
    } catch (error) {
      console.error('Failed to load bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectBills = async () => {
    setDetecting(true);
    try {
      const response = await base44.functions.invoke('detectBills', { entity_id: entityId });
      
      if (response.data.success) {
        toast.success(`Detected ${response.data.created_count} recurring bills`);
        loadBills();
      } else {
        toast.error('Failed to detect bills');
      }
    } catch (error) {
      toast.error('Failed to detect bills');
    } finally {
      setDetecting(false);
    }
  };

  const markAsPaid = async (bill) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const payment = {
        date: today,
        amount: bill.typical_amount,
        transaction_id: null
      };

      // Calculate next due date
      let nextDue = new Date(bill.due_date);
      if (bill.frequency === 'monthly') {
        nextDue.setMonth(nextDue.getMonth() + 1);
      } else if (bill.frequency === 'quarterly') {
        nextDue.setMonth(nextDue.getMonth() + 3);
      } else if (bill.frequency === 'yearly') {
        nextDue.setFullYear(nextDue.getFullYear() + 1);
      }

      await base44.entities.Bill.update(bill.id, {
        status: 'paid',
        last_paid_date: today,
        last_paid_amount: bill.typical_amount,
        due_date: nextDue.toISOString().split('T')[0],
        payment_history: [...(bill.payment_history || []), payment]
      });

      toast.success('Bill marked as paid');
      loadBills();
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to mark bill as paid');
    }
  };

  const getStatusColor = (status) => {
    if (status === 'paid') return 'bg-green-100 text-green-800';
    if (status === 'overdue') return 'bg-red-100 text-red-800';
    return 'bg-amber-100 text-amber-800';
  };

  const getStatusIcon = (status) => {
    if (status === 'paid') return CheckCircle;
    if (status === 'overdue') return AlertCircle;
    return Bell;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" />
            Bill Reminders
          </CardTitle>
          <Button
            size="sm"
            onClick={detectBills}
            disabled={detecting}
            className="bg-gradient-to-r from-amber-500 to-blue-800 text-white"
          >
            {detecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Auto-Detect Bills
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {bills.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No bills tracked yet</p>
            <p className="text-sm text-gray-400">Click "Auto-Detect Bills" to find recurring payments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bills.filter(b => b.status !== 'paid').map((bill) => {
              const StatusIcon = getStatusIcon(bill.status);
              
              return (
                <div key={bill.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{bill.name}</h4>
                        <Badge className={getStatusColor(bill.status)}>
                          {bill.status}
                        </Badge>
                        {bill.auto_detected && (
                          <Badge variant="outline" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Detected
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {format(parseISO(bill.due_date), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span>${bill.typical_amount?.toFixed(2)}</span>
                        </div>
                        {bill.status === 'upcoming' && bill.daysUntilDue >= 0 && (
                          <span className="text-amber-600 font-medium">
                            {bill.daysUntilDue === 0 ? 'Due today' : `${bill.daysUntilDue} days`}
                          </span>
                        )}
                        {bill.status === 'overdue' && (
                          <span className="text-red-600 font-medium">
                            {Math.abs(bill.daysUntilDue)} days overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => markAsPaid(bill)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark Paid
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}