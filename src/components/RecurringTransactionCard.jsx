import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowDownCircle, ArrowUpCircle, Trash2, Play } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function RecurringTransactionCard({ recurring, onDelete, onRefresh }) {
  const handleGenerateNow = async () => {
    try {
      // Create transaction immediately
      await base44.entities.Transaction.create({
        entity_id: recurring.entity_id,
        account_id: recurring.account_id,
        type: recurring.type,
        amount: recurring.amount,
        date: new Date().toISOString().split('T')[0],
        description: `${recurring.name} (Manual trigger)`,
        category_id: recurring.category_id,
        subcategory_id: recurring.subcategory_id,
        recurring_transaction_id: recurring.id,
        notes: 'Manually generated from recurring transaction'
      });
      
      toast.success('Transaction created successfully');
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to create transaction');
    }
  };

  return (
    <Card className="bg-white hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {recurring.type === 'income' ? (
              <ArrowUpCircle className="w-6 h-6 text-green-600" />
            ) : (
              <ArrowDownCircle className="w-6 h-6 text-red-600" />
            )}
            <div>
              <CardTitle className="text-lg">{recurring.name}</CardTitle>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {recurring.frequency}
                </Badge>
                {recurring.is_variable && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                    Variable
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateNow}
              className="text-blue-800 border-blue-300 hover:bg-blue-50"
            >
              <Play className="w-4 h-4 mr-1" />
              Generate Now
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(recurring.id)}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Amount</p>
            <p className={`text-xl font-semibold ${recurring.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              ${Number(recurring.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Next Date</p>
            <p className="text-lg font-medium text-gray-900">
              {format(parseISO(recurring.next_date), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}