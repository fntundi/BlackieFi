import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all active recurring transactions
    const recurringTxs = await base44.asServiceRole.entities.RecurringTransaction.filter({ is_active: true });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const results = {
      processed: 0,
      created: 0,
      errors: []
    };
    
    for (const recurring of recurringTxs) {
      try {
        const nextDate = new Date(recurring.next_date);
        nextDate.setHours(0, 0, 0, 0);
        
        // Check if transaction is due
        if (nextDate <= today) {
          // Create the transaction
          await base44.asServiceRole.entities.Transaction.create({
            entity_id: recurring.entity_id,
            account_id: recurring.account_id,
            type: recurring.type,
            amount: recurring.amount,
            date: recurring.next_date,
            description: recurring.name,
            category_id: recurring.category_id,
            subcategory_id: recurring.subcategory_id,
            recurring_transaction_id: recurring.id,
            notes: recurring.is_variable ? 'Variable amount - may need adjustment' : 'Auto-generated from recurring transaction'
          });
          
          results.created++;
          
          // Calculate next occurrence date
          const newNextDate = calculateNextDate(nextDate, recurring.frequency, recurring.custom_interval_days);
          
          // Update recurring transaction with new next_date
          await base44.asServiceRole.entities.RecurringTransaction.update(recurring.id, {
            next_date: newNextDate.toISOString().split('T')[0]
          });
          
          results.processed++;
        }
      } catch (error) {
        results.errors.push({
          recurring_id: recurring.id,
          name: recurring.name,
          error: error.message
        });
      }
    }
    
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
    
  } catch (error) {
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});

function calculateNextDate(currentDate, frequency, customIntervalDays) {
  const next = new Date(currentDate);
  
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'semimonthly':
      next.setDate(next.getDate() + 15);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'custom':
      if (customIntervalDays) {
        next.setDate(next.getDate() + customIntervalDays);
      } else {
        next.setMonth(next.getMonth() + 1); // Default to monthly
      }
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  
  return next;
}