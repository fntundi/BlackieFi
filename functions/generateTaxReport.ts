import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id, tax_year } = await req.json();

    const transactions = await base44.entities.Transaction.filter({ entity_id });
    const categories = await base44.entities.Category.list();
    const entity = await base44.entities.Entity.get(entity_id);
    const scenarios = await base44.entities.TaxScenario.filter({ 
      entity_id, 
      tax_year 
    });

    const yearTransactions = transactions.filter(t => 
      new Date(t.date).getFullYear() === tax_year
    );

    const incomeTransactions = yearTransactions.filter(t => t.type === 'income');
    const expenseTransactions = yearTransactions.filter(t => t.type === 'expense');

    const incomeByCategory = {};
    incomeTransactions.forEach(t => {
      const cat = categories.find(c => c.id === t.category_id);
      const catName = cat?.name || 'Other Income';
      if (!incomeByCategory[catName]) {
        incomeByCategory[catName] = [];
      }
      incomeByCategory[catName].push({
        date: t.date,
        description: t.description,
        amount: t.amount
      });
    });

    const expenseByCategory = {};
    expenseTransactions.forEach(t => {
      const cat = categories.find(c => c.id === t.category_id);
      const catName = cat?.name || 'Other Expenses';
      if (!expenseByCategory[catName]) {
        expenseByCategory[catName] = [];
      }
      expenseByCategory[catName].push({
        date: t.date,
        description: t.description,
        amount: t.amount
      });
    });

    const report = {
      entity_name: entity.name,
      entity_type: entity.type,
      tax_year: tax_year,
      generated_date: new Date().toISOString(),
      
      income_summary: {
        total: incomeTransactions.reduce((sum, t) => sum + t.amount, 0),
        by_category: Object.entries(incomeByCategory).map(([category, items]) => ({
          category,
          total: items.reduce((sum, i) => sum + i.amount, 0),
          count: items.length,
          transactions: items
        }))
      },

      expense_summary: {
        total: expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
        by_category: Object.entries(expenseByCategory).map(([category, items]) => ({
          category,
          total: items.reduce((sum, i) => sum + i.amount, 0),
          count: items.length,
          transactions: items
        }))
      },

      tax_scenarios: scenarios.map(s => ({
        name: s.name,
        filing_status: s.filing_status,
        total_income: s.total_income,
        total_deductions: s.total_deductions,
        estimated_tax_liability: s.estimated_tax_liability,
        effective_tax_rate: s.effective_tax_rate,
        potential_deductions: s.potential_deductions,
        potential_credits: s.potential_credits
      })),

      notes: [
        "This report is for informational purposes only and should not be considered professional tax advice.",
        "Please consult with a qualified tax professional or CPA for official tax preparation.",
        "All estimates are based on AI analysis and may not reflect actual tax obligations."
      ]
    };

    return Response.json(report);

  } catch (error) {
    console.error('Error generating tax report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});