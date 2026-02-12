import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpCircle, ArrowDownCircle, Sparkles, Check, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TransactionRow({ transaction, categories, onUpdate }) {
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(transaction.category_id || '');

  const category = categories.find(c => c.id === transaction.category_id);
  const typeIcon = transaction.type === 'income' ? ArrowUpCircle : ArrowDownCircle;
  const typeColor = transaction.type === 'income' ? 'text-green-600' : 'text-red-600';
  const TypeIcon = typeIcon;

  const getSuggestion = async () => {
    setLoadingSuggestion(true);
    try {
      const response = await base44.functions.invoke('categorizeTransaction', {
        transaction_id: transaction.id,
        entity_id: transaction.entity_id
      });

      if (response.data.success) {
        setSuggestion(response.data.suggestion);
        setShowSuggestion(true);
      } else {
        toast.error('Could not get AI suggestion');
      }
    } catch (error) {
      toast.error('Failed to get suggestion');
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const acceptSuggestion = async () => {
    try {
      await base44.entities.Transaction.update(transaction.id, {
        category_id: suggestion.category_id
      });
      setShowSuggestion(false);
      setSuggestion(null);
      setSelectedCategory(suggestion.category_id);
      onUpdate();
      toast.success('Category updated');
    } catch (error) {
      toast.error('Failed to update category');
    }
  };

  const rejectSuggestion = () => {
    setShowSuggestion(false);
    setSuggestion(null);
  };

  const handleCategoryChange = async (categoryId) => {
    try {
      await base44.entities.Transaction.update(transaction.id, {
        category_id: categoryId
      });
      setSelectedCategory(categoryId);
      onUpdate();
      toast.success('Category updated');
    } catch (error) {
      toast.error('Failed to update category');
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${transaction.type === 'income' ? 'bg-green-50' : 'bg-red-50'}`}>
              <TypeIcon className={`w-5 h-5 ${typeColor}`} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{transaction.description}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">
                  {new Date(transaction.date).toLocaleDateString()}
                </span>
                {transaction.import_source !== 'manual' && (
                  <Badge variant="outline" className="text-xs">
                    {transaction.import_source}
                  </Badge>
                )}
              </div>
              
              {showSuggestion && suggestion && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900">
                        AI suggests: <span className="font-bold">{suggestion.category_name}</span>
                      </p>
                      <p className="text-xs text-amber-700 mt-1">{suggestion.reason}</p>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          size="sm" 
                          onClick={acceptSuggestion}
                          className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={rejectSuggestion}
                          className="h-7 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-2">
              <span className={`text-lg font-bold ${typeColor}`}>
                {transaction.type === 'income' ? '+' : '-'}${transaction.amount?.toFixed(2)}
              </span>
              
              <div className="flex items-center gap-2">
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue placeholder="Uncategorized" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(c => c.type === transaction.type || c.type === 'both')
                      .map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {!transaction.category_id && !showSuggestion && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={getSuggestion}
                    disabled={loadingSuggestion}
                    className="h-8 px-2"
                    title="Get AI suggestion"
                  >
                    {loadingSuggestion ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-amber-600" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}