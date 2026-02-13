import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id, tax_year, filing_status } = await req.json();

    const currentYear = new Date().getFullYear();
    const targetYear = tax_year || currentYear;

    const transactions = await base44.entities.Transaction.filter({ entity_id });
    const categories = await base44.entities.Category.list();
    const entity = await base44.entities.Entity.get(entity_id);

    const yearTransactions = transactions.filter(t => 
      new Date(t.date).getFullYear() === targetYear
    );

    const totalIncome = yearTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expensesByCategory = {};
    yearTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = categories.find(c => c.id === t.category_id);
        const catName = cat?.name || 'Other';
        expensesByCategory[catName] = (expensesByCategory[catName] || 0) + t.amount;
      });

    const prompt = `You are a tax expert. Estimate the tax liability and identify deductions for this financial profile.

Entity Type: ${entity.type}
Filing Status: ${filing_status}
Tax Year: ${targetYear}

Income Summary:
- Total Income: $${totalIncome.toFixed(2)}

Expense Breakdown by Category:
${JSON.stringify(expensesByCategory, null, 2)}

Provide:
1. Estimated total tax liability (federal)
2. Effective tax rate
3. List of potential deductions with amounts (business expenses, home office, vehicle, charitable, etc.)
4. List of potential tax credits with amounts
5. Tax optimization recommendations

IMPORTANT: Base calculations on general US tax law for ${targetYear}. For business entities, consider self-employment tax and business deductions. Provide realistic estimates.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          estimated_tax_liability: { type: "number" },
          effective_tax_rate: { type: "number" },
          total_deductions: { type: "number" },
          potential_deductions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                amount: { type: "number" },
                category: { type: "string" },
                description: { type: "string" }
              }
            }
          },
          potential_credits: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                amount: { type: "number" },
                description: { type: "string" }
              }
            }
          },
          recommendations: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    return Response.json({
      ...response,
      total_income: totalIncome,
      tax_year: targetYear
    });

  } catch (error) {
    console.error('Error estimating tax liability:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});