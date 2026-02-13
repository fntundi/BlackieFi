import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_type, entity_id, start_date, end_date, category_id } = await req.json();

    // Fetch data
    const transactions = await base44.entities.Transaction.filter({ 
      entity_id,
      date: { $gte: start_date, $lte: end_date }
    });

    const categories = await base44.entities.Category.list();
    const budgets = await base44.entities.Budget.filter({ entity_id });
    const debts = await base44.entities.Debt.filter({ entity_id });
    const assets = await base44.entities.Asset.filter({ entity_id });

    let reportData = {};

    if (report_type === 'profit_loss') {
      const income = transactions.filter(t => t.type === 'income');
      const expenses = transactions.filter(t => t.type === 'expense');
      
      const incomeByCategory = income.reduce((acc, t) => {
        const cat = categories.find(c => c.id === t.category_id);
        const catName = cat?.name || 'Uncategorized';
        acc[catName] = (acc[catName] || 0) + t.amount;
        return acc;
      }, {});

      const expensesByCategory = expenses.reduce((acc, t) => {
        const cat = categories.find(c => c.id === t.category_id);
        const catName = cat?.name || 'Uncategorized';
        acc[catName] = (acc[catName] || 0) + t.amount;
        return acc;
      }, {});

      const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
      const netIncome = totalIncome - totalExpenses;

      reportData = {
        income: incomeByCategory,
        expenses: expensesByCategory,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_income: netIncome,
        profit_margin: totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0
      };
    }

    if (report_type === 'balance_sheet') {
      const totalAssets = assets.reduce((sum, a) => sum + (a.current_value || a.purchase_price), 0);
      const totalLiabilities = debts.reduce((sum, d) => sum + d.current_balance, 0);
      const equity = totalAssets - totalLiabilities;

      const assetsByType = assets.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + (a.current_value || a.purchase_price);
        return acc;
      }, {});

      const liabilitiesByType = debts.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] || 0) + d.current_balance;
        return acc;
      }, {});

      reportData = {
        assets: assetsByType,
        liabilities: liabilitiesByType,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        equity: equity,
        debt_to_equity_ratio: equity > 0 ? totalLiabilities / equity : 0
      };
    }

    if (report_type === 'cash_flow') {
      const income = transactions.filter(t => t.type === 'income');
      const expenses = transactions.filter(t => t.type === 'expense');

      // Group by month
      const monthlyData = {};
      
      transactions.forEach(t => {
        const month = t.date.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { income: 0, expenses: 0, net: 0 };
        }
        if (t.type === 'income') {
          monthlyData[month].income += t.amount;
        } else if (t.type === 'expense') {
          monthlyData[month].expenses += t.amount;
        }
        monthlyData[month].net = monthlyData[month].income - monthlyData[month].expenses;
      });

      reportData = {
        monthly_cash_flow: monthlyData,
        total_cash_in: income.reduce((sum, t) => sum + t.amount, 0),
        total_cash_out: expenses.reduce((sum, t) => sum + t.amount, 0),
        net_cash_flow: income.reduce((sum, t) => sum + t.amount, 0) - expenses.reduce((sum, t) => sum + t.amount, 0)
      };
    }

    if (report_type === 'budget_vs_actual') {
      const currentMonth = start_date.substring(0, 7);
      const monthBudget = budgets.find(b => b.month === currentMonth);
      
      if (!monthBudget) {
        return Response.json({ 
          error: 'No budget found for selected period',
          report_data: { categories: [] }
        });
      }

      const expenseTransactions = transactions.filter(t => t.type === 'expense');
      
      const categoryComparison = monthBudget.category_budgets.map(cb => {
        const cat = categories.find(c => c.id === cb.category_id);
        const actual = expenseTransactions
          .filter(t => t.category_id === cb.category_id)
          .reduce((sum, t) => sum + t.amount, 0);
        
        return {
          category_name: cat?.name || 'Unknown',
          budgeted: cb.planned_amount,
          actual: actual,
          variance: cb.planned_amount - actual,
          variance_percent: cb.planned_amount > 0 ? ((cb.planned_amount - actual) / cb.planned_amount) * 100 : 0
        };
      });

      reportData = {
        categories: categoryComparison,
        total_budgeted: monthBudget.total_planned || 0,
        total_actual: expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
        total_variance: (monthBudget.total_planned || 0) - expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
      };
    }

    return Response.json({
      report_type,
      period: { start_date, end_date },
      report_data: reportData,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});