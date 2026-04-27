import type { FastifyReply, FastifyRequest } from "fastify";
import type { AppUser } from "./auth.js";
import { buildReportPdf } from "./pdf.js";
import { createRecord, getRecord, listRecords, updateRecord } from "./entity-store.js";
import { invokeTool } from "./ai.js";

type Handler = (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => Promise<unknown>;

function monthKey(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toISOString().slice(0, 7);
}

function addMonths(input: Date, months: number) {
  const next = new Date(input);
  next.setMonth(next.getMonth() + months);
  return next;
}

function mean(values: number[]) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sumAmounts(records: Record<string, any>[]) {
  return records.reduce((sum, record) => sum + Number(record.amount ?? 0), 0);
}

function categoryName(categoryId: string | null | undefined, categories: Record<string, any>[]) {
  return categories.find((category) => category.id === categoryId)?.name ?? "Uncategorized";
}

function calculateNextDate(currentDate: Date, frequency: string, customIntervalDays?: number) {
  const next = new Date(currentDate);
  switch (frequency) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "semimonthly":
      next.setDate(next.getDate() + 15);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    case "custom":
      next.setDate(next.getDate() + (customIntervalDays || 30));
      break;
    default:
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}

async function getEntityScopedData(entityId: string, user: AppUser) {
  const [transactions, categories, budgets, debts, assets, recurring, profiles, goals, holdings, vehicles, bills] =
    await Promise.all([
      listRecords("Transaction", { filter: { entity_id: entityId } }, user),
      listRecords("Category", {}, user),
      listRecords("Budget", { filter: { entity_id: entityId } }, user),
      listRecords("Debt", { filter: { entity_id: entityId } }, user),
      listRecords("Asset", { filter: { entity_id: entityId } }, user),
      listRecords("RecurringTransaction", { filter: { entity_id: entityId } }, user),
      listRecords("FinancialProfile", { filter: { entity_id: entityId } }, user),
      listRecords("FinancialGoal", { filter: { entity_id: entityId } }, user),
      listRecords("InvestmentHolding", {}, user),
      listRecords("InvestmentVehicle", { filter: { entity_id: entityId } }, user),
      listRecords("Bill", { filter: { entity_id: entityId } }, user)
    ]);

  const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
  const scopedHoldings = holdings.filter((holding) => vehicleIds.has(holding.vehicle_id));

  return {
    transactions,
    categories,
    budgets,
    debts,
    assets,
    recurring,
    profiles,
    goals,
    holdings: scopedHoldings,
    vehicles,
    bills
  };
}

async function detectAnomalies(request: FastifyRequest<{ Body: { entity_id: string } }>) {
  const { entity_id } = request.body;
  const user = request.user!;
  const { transactions, categories } = await getEntityScopedData(entity_id, user);
  const expenses = transactions.filter((transaction) => transaction.type === "expense");

  if (expenses.length < 5) {
    return { anomalies: [], analyzed_transactions: expenses.length };
  }

  const average = mean(expenses.map((expense) => Number(expense.amount ?? 0)));
  const anomalies = expenses
    .filter((expense) => Number(expense.amount ?? 0) > average * 1.8)
    .slice(0, 10)
    .map((expense) => ({
      category: categoryName(expense.category_id, categories),
      description: expense.description,
      severity: Number(expense.amount) > average * 2.5 ? "high" : "medium",
      potential_impact: Number(expense.amount) - average,
      recommendation: `Review ${expense.description} for one-off or avoidable spend.`
    }));

  return { anomalies, analyzed_transactions: expenses.length };
}

async function forecastCashFlow(request: FastifyRequest<{ Body: { entity_id: string; forecast_months?: number } }>) {
  const { entity_id, forecast_months = 3 } = request.body;
  const user = request.user!;
  const { transactions, recurring } = await getEntityScopedData(entity_id, user);

  const byMonth = new Map<string, { income: number; expenses: number }>();
  for (const transaction of transactions) {
    const key = monthKey(transaction.date);
    const current = byMonth.get(key) ?? { income: 0, expenses: 0 };
    if (transaction.type === "income") {
      current.income += Number(transaction.amount ?? 0);
    } else if (transaction.type === "expense") {
      current.expenses += Number(transaction.amount ?? 0);
    }
    byMonth.set(key, current);
  }

  const history = [...byMonth.entries()].sort(([left], [right]) => left.localeCompare(right));
  const avgIncome = mean(history.map(([, value]) => value.income));
  const avgExpenses = mean(history.map(([, value]) => value.expenses));
  const recurringIncome = recurring.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const recurringExpense = recurring.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const forecast = [];
  const today = new Date();
  for (let index = 1; index <= forecast_months; index++) {
    const month = addMonths(today, index);
    const predicted_income = avgIncome || recurringIncome;
    const predicted_expenses = Math.max(avgExpenses, recurringExpense || avgExpenses);
    forecast.push({
      month: month.toLocaleString("en-US", { month: "short", year: "numeric" }),
      predicted_income,
      predicted_expenses,
      net_cash_flow: predicted_income - predicted_expenses,
      confidence: index === 1 ? "high" : index === 2 ? "medium" : "low"
    });
  }

  return {
    forecast,
    assumptions: [
      "Historical monthly averages are used as the baseline.",
      "Active recurring transactions are treated as committed cash flow."
    ]
  };
}

async function identifyCostSavings(request: FastifyRequest<{ Body: { entity_id: string } }>) {
  const { entity_id } = request.body;
  const user = request.user!;
  const { transactions, categories, recurring } = await getEntityScopedData(entity_id, user);

  const expenses = transactions.filter((transaction) => transaction.type === "expense");
  const grouped = new Map<string, number>();
  for (const expense of expenses) {
    const key = categoryName(expense.category_id, categories);
    grouped.set(key, (grouped.get(key) ?? 0) + Number(expense.amount ?? 0));
  }

  const opportunities = [...grouped.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([category, total]) => ({
      category,
      description: `Recent spending in ${category} is running above your average pacing.`,
      estimated_monthly_savings: total * 0.08,
      difficulty: total > 5000 ? "hard" : total > 2500 ? "moderate" : "easy",
      action_steps: [
        `Review the largest ${category.toLowerCase()} purchases from the last 90 days.`,
        "Set a tighter short-term target and monitor weekly variance.",
        "Move recurring charges in this category to a separate review list."
      ]
    }));

  const recurringWaste = recurring
    .filter((item) => item.type === "expense")
    .slice(0, 3)
    .map((item) => ({
      category: item.name,
      description: "Recurring expense worth reviewing for negotiation or cancellation.",
      estimated_monthly_savings: Number(item.amount ?? 0) * 0.15,
      difficulty: "easy",
      action_steps: [`Review ${item.name}`, "Negotiate or cancel if non-essential."]
    }));

  const combined = [...opportunities, ...recurringWaste].slice(0, 6);

  return {
    opportunities: combined,
    total_potential_savings: combined.reduce((sum, item) => sum + item.estimated_monthly_savings, 0)
  };
}

async function detectBills(request: FastifyRequest<{ Body: { entity_id: string } }>) {
  const { entity_id } = request.body;
  const user = request.user!;
  const { transactions } = await getEntityScopedData(entity_id, user);
  const expenses = transactions.filter((transaction) => transaction.type === "expense");
  const grouped = new Map<string, Record<string, any>[]>();

  for (const expense of expenses) {
    const key = String(expense.description ?? "").trim().toLowerCase();
    if (!key) {
      continue;
    }
    const current = grouped.get(key) ?? [];
    current.push(expense);
    grouped.set(key, current);
  }

  const detected = [];
  for (const [key, records] of grouped.entries()) {
    if (records.length < 2) {
      continue;
    }

    const amounts = records.map((record) => Number(record.amount ?? 0));
    const avg = mean(amounts);
    const sample = records[0];
    const bill = await createRecord("Bill", {
      entity_id,
      name: sample.description,
      due_date: sample.date,
      typical_amount: avg,
      reminder_days: 5,
      status: "upcoming",
      frequency: "monthly",
      auto_detected: true,
      payment_history: []
    }, user);
    detected.push(bill);
  }

  return {
    success: true,
    detected_count: detected.length,
    created_count: detected.length,
    bills: detected
  };
}

async function categorizeTransaction(request: FastifyRequest<{ Body: { transaction_id: string; entity_id: string } }>) {
  const user = request.user!;
  const { transaction_id, entity_id } = request.body;
  const transaction = await getRecord("Transaction", transaction_id, user);
  if (!transaction) {
    return { success: false, error: "Transaction not found" };
  }

  const categories = await listRecords("Category", {}, user);
  const recent = await listRecords("Transaction", { filter: { entity_id } }, user);
  const description = String(transaction.description ?? "").toLowerCase();

  for (const category of categories) {
    const rules = Array.isArray(category.auto_categorization_rules) ? category.auto_categorization_rules : [];
    for (const rule of rules) {
      if (description.includes(String(rule).toLowerCase())) {
        return {
          success: true,
          suggestion: {
            category_id: category.id,
            category_name: category.name,
            confidence: "high",
            reason: `Matched category rule "${rule}".`
          }
        };
      }
    }
  }

  const similar = recent.find((record) => {
    if (!record.category_id || record.id === transaction_id) {
      return false;
    }
    return String(record.description ?? "").toLowerCase() === description;
  });

  if (similar) {
    const category = categories.find((entry) => entry.id === similar.category_id);
    return {
      success: true,
      suggestion: {
        category_id: similar.category_id,
        category_name: category?.name ?? "Uncategorized",
        confidence: "medium",
        reason: "Matched a recent transaction with the same description."
      }
    };
  }

  const fallback = categories.find((category) => ["misc", "miscellaneous", "other"].includes(String(category.name).toLowerCase())) ?? categories[0];
  return {
    success: true,
    suggestion: {
      category_id: fallback?.id ?? null,
      category_name: fallback?.name ?? "Uncategorized",
      confidence: "low",
      reason: "No strong pattern found, suggested default catch-all category."
    }
  };
}

async function generateTransactionTags(request: FastifyRequest<{ Body: { transaction_id: string } }>) {
  const user = request.user!;
  const { transaction_id } = request.body;
  const transaction = await getRecord("Transaction", transaction_id, user);
  if (!transaction) {
    return { success: false, error: "Transaction not found" };
  }

  const tags = new Set<string>();
  const description = String(transaction.description ?? "").toLowerCase();
  const amount = Number(transaction.amount ?? 0);

  if (transaction.type === "expense") {
    tags.add("expense");
  } else if (transaction.type === "income") {
    tags.add("income");
  }
  if (description.includes("subscription") || description.includes("netflix") || description.includes("spotify")) {
    tags.add("subscription");
  }
  if (description.includes("rent") || description.includes("mortgage") || description.includes("utility")) {
    tags.add("essential");
  }
  if (amount > 1000) {
    tags.add("high-value");
  }
  if (amount < 100) {
    tags.add("small-ticket");
  }
  if (!tags.size) {
    tags.add("review");
  }

  await updateRecord("Transaction", transaction_id, { ai_tags: [...tags] }, user);
  return { success: true, tags: [...tags] };
}

async function generateBudget(request: FastifyRequest<{ Body: { entity_id: string; month: string } }>) {
  const user = request.user!;
  const { entity_id, month } = request.body;
  const { transactions, categories } = await getEntityScopedData(entity_id, user);
  const startDate = new Date(`${month}-01`);
  startDate.setMonth(startDate.getMonth() - 3);
  const recent = transactions.filter((transaction) => transaction.type === "expense" && new Date(transaction.date) >= startDate);
  const suggestions = categories
    .map((category) => {
      const matching = recent.filter((transaction) => transaction.category_id === category.id);
      const average = mean(matching.map((transaction) => Number(transaction.amount ?? 0)));
      return {
        category_id: category.id,
        category_name: category.name,
        suggested_amount: Number((average * 1.1 || 100).toFixed(2)),
        reasoning: matching.length
          ? "Based on the trailing three-month average with a 10% cushion."
          : "Seeded with a starter value because there is not enough recent spend history."
      };
    })
    .filter((category) => category.suggested_amount > 0);

  return { success: true, budget_suggestions: suggestions };
}

async function forecastBudget(request: FastifyRequest<{ Body: { entity_id: string; forecast_months?: number } }>) {
  const user = request.user!;
  const { entity_id, forecast_months = 3 } = request.body;
  const { transactions, recurring } = await getEntityScopedData(entity_id, user);
  const history = await forecastCashFlow({
    ...request,
    body: { entity_id, forecast_months }
  } as FastifyRequest<{ Body: { entity_id: string; forecast_months?: number } }>);

  const monthly_forecasts = history.forecast.map((month) => ({
    month: month.month,
    forecasted_income: month.predicted_income,
    forecasted_expenses: month.predicted_expenses,
    ending_balance: month.net_cash_flow,
    confidence: month.confidence
  }));

  const recentExpenses = transactions.filter((transaction) => transaction.type === "expense");
  const recurringExpenses = recurring.filter((record) => record.type === "expense");
  const riskLevel = recentExpenses.length > 20 ? "medium" : "low";
  const topRecurring = recurringExpenses
    .slice(0, 4)
    .map((expense) => ({
      category: expense.name,
      priority: Number(expense.amount ?? 0) > 500 ? "high" : "medium",
      reason: "Recurring expense with predictable monthly impact.",
      current_avg: Number(expense.amount ?? 0),
      suggested_budget: Number(expense.amount ?? 0) * 0.95
    }));

  return {
    success: true,
    forecast: {
      monthly_forecasts,
      overall_health_score: Math.max(0, Math.min(100, Math.round(65 + monthly_forecasts[0].ending_balance / 100))),
      insights: {
        spending_trend: "stable",
        income_stability: "moderate",
        risk_level: riskLevel,
        potential_shortfalls: monthly_forecasts.filter((item) => item.ending_balance < 0).map((item) => `${item.month} projects a negative balance.`),
        potential_surpluses: monthly_forecasts.filter((item) => item.ending_balance > 0).map((item) => `${item.month} projects a positive balance.`)
      },
      recommendations: topRecurring,
      action_items: [
        "Review recurring expenses and cancel or renegotiate non-essential services.",
        "Keep a two-month expense buffer in cash.",
        "Track actuals weekly against the projected ending balance."
      ]
    }
  };
}

export async function processRecurringTransactions(_request: FastifyRequest) {
  const user = _request.user!;
  const recurring = await listRecords("RecurringTransaction", { filter: { is_active: true } }, user);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results = { processed: 0, created: 0, errors: [] as Array<Record<string, unknown>> };

  for (const item of recurring) {
    try {
      const nextDate = new Date(item.next_date);
      nextDate.setHours(0, 0, 0, 0);
      if (nextDate > today) {
        continue;
      }

      await createRecord("Transaction", {
        entity_id: item.entity_id,
        account_id: item.account_id,
        type: item.type,
        amount: item.amount,
        date: item.next_date,
        description: item.name,
        category_id: item.category_id,
        subcategory_id: item.subcategory_id,
        recurring_transaction_id: item.id,
        notes: item.is_variable ? "Variable amount - may need adjustment" : "Auto-generated from recurring transaction"
      }, user);

      const newNextDate = calculateNextDate(nextDate, String(item.frequency ?? "monthly"), Number(item.custom_interval_days ?? 0) || undefined);
      await updateRecord("RecurringTransaction", item.id, {
        next_date: newNextDate.toISOString().split("T")[0]
      }, user);

      results.created += 1;
      results.processed += 1;
    } catch (error) {
      results.errors.push({
        recurring_id: item.id,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return {
    success: true,
    timestamp: new Date().toISOString(),
    results
  };
}

async function getAccessibleEntities(request: FastifyRequest) {
  const user = request.user!;
  const entities = await listRecords("Entity", {}, user);
  return { success: true, entities, is_admin: user.role === "admin" };
}

async function generateFinancialReport(request: FastifyRequest<{ Body: { report_type: string; entity_id: string; start_date: string; end_date: string } }>) {
  const user = request.user!;
  const { entity_id, start_date, end_date, report_type } = request.body;
  const { transactions, categories, debts, assets } = await getEntityScopedData(entity_id, user);
  const scoped = transactions.filter((transaction) => transaction.date >= start_date && transaction.date <= end_date);
  const income = scoped.filter((transaction) => transaction.type === "income");
  const expenses = scoped.filter((transaction) => transaction.type === "expense");

  const incomeByCategory = income.reduce<Record<string, number>>((accumulator, transaction) => {
    const key = categoryName(transaction.category_id, categories);
    accumulator[key] = (accumulator[key] ?? 0) + Number(transaction.amount ?? 0);
    return accumulator;
  }, {});

  const expensesByCategory = expenses.reduce<Record<string, number>>((accumulator, transaction) => {
    const key = categoryName(transaction.category_id, categories);
    accumulator[key] = (accumulator[key] ?? 0) + Number(transaction.amount ?? 0);
    return accumulator;
  }, {});

  const total_income = sumAmounts(income);
  const total_expenses = sumAmounts(expenses);
  const net_income = total_income - total_expenses;
  const ebitda = net_income;

  const reportData = report_type === "balance_sheet"
    ? {
        assets: assets.map((asset) => ({ name: asset.name, value: Number(asset.current_value ?? asset.purchase_price ?? 0) })),
        debts: debts.map((debt) => ({ name: debt.name, balance: Number(debt.current_balance ?? 0) })),
        total_assets: assets.reduce((sum, asset) => sum + Number(asset.current_value ?? asset.purchase_price ?? 0), 0),
        total_liabilities: debts.reduce((sum, debt) => sum + Number(debt.current_balance ?? 0), 0)
      }
    : {
        income: incomeByCategory,
        expenses: expensesByCategory,
        total_income,
        total_expenses,
        net_income,
        ebitda,
        ebitda_margin: total_income ? (ebitda / total_income) * 100 : 0,
        profit_margin: total_income ? (net_income / total_income) * 100 : 0
      };

  return {
    success: true,
    report_type,
    report_data: reportData,
    period: { start_date, end_date },
    generated_at: new Date().toISOString()
  };
}

async function exportReportPDF(request: FastifyRequest<{ Body: { report_type: string; report_data: Record<string, unknown>; period: { start_date: string; end_date: string }; entity_name?: string } }>, reply: FastifyReply) {
  const pdf = await buildReportPdf({
    reportType: request.body.report_type,
    reportData: request.body.report_data,
    period: request.body.period,
    entityName: request.body.entity_name
  });

  reply.header("content-type", "application/pdf");
  reply.header("content-disposition", `attachment; filename="${request.body.report_type}.pdf"`);
  return reply.send(pdf);
}

async function estimateTaxLiability(request: FastifyRequest<{ Body: { entity_id: string; tax_year?: number; filing_status?: string } }>) {
  const user = request.user!;
  const { entity_id, tax_year = new Date().getFullYear(), filing_status = "single" } = request.body;
  const { transactions, categories } = await getEntityScopedData(entity_id, user);
  const yearTransactions = transactions.filter((transaction) => new Date(transaction.date).getFullYear() === tax_year);
  const income = yearTransactions.filter((transaction) => transaction.type === "income");
  const expenses = yearTransactions.filter((transaction) => transaction.type === "expense");
  const total_income = sumAmounts(income);
  const deductions = expenses
    .filter((transaction) => {
      const name = categoryName(transaction.category_id, categories).toLowerCase();
      return ["tax", "charity", "business", "medical", "insurance"].some((keyword) => name.includes(keyword));
    })
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  const effectiveRate = filing_status === "married_filing_jointly" ? 0.18 : 0.22;
  const estimated_tax_liability = Math.max(0, (total_income - deductions) * effectiveRate);

  return {
    total_income,
    total_deductions: deductions,
    estimated_tax_liability,
    effective_tax_rate: total_income ? (estimated_tax_liability / total_income) * 100 : 0,
    filing_status,
    recommendations: [
      "Review retirement contributions for additional pre-tax savings.",
      "Tag business-related transactions consistently for cleaner deduction review.",
      "Validate large charitable or medical deductions with supporting documents."
    ],
    deductions: [
      { name: "Tracked deductible expenses", amount: deductions }
    ],
    credits: []
  };
}

async function analyzeTaxScenario(request: FastifyRequest<{ Body: { baseline_scenario_id: string; adjustments: Record<string, number> } }>) {
  const user = request.user!;
  const baseline = await getRecord("TaxScenario", request.body.baseline_scenario_id, user);
  if (!baseline) {
    return { error: "Baseline scenario not found" };
  }

  const adjustmentTotal = Object.values(request.body.adjustments ?? {}).reduce((sum, value) => sum + Number(value ?? 0), 0);
  const estimated_tax_liability = Math.max(0, Number(baseline.estimated_tax_liability ?? 0) - adjustmentTotal * 0.22);
  const tax_savings = Number(baseline.estimated_tax_liability ?? 0) - estimated_tax_liability;
  const total_income = Number(baseline.total_income ?? 0);

  return {
    new_estimated_tax_liability: estimated_tax_liability,
    new_effective_tax_rate: total_income ? (estimated_tax_liability / total_income) * 100 : 0,
    total_tax_savings: tax_savings,
    take_home_impact: tax_savings,
    breakdown: Object.entries(request.body.adjustments ?? {}).map(([name, value]) => ({
      adjustment: name,
      amount: Number(value),
      estimated_tax_impact: Number(value) * 0.22
    })),
    risk_assessment: tax_savings > 10000 ? "Higher impact scenario; review assumptions before execution." : "Moderate scenario with manageable assumptions."
  };
}

async function generateTaxReport(request: FastifyRequest<{ Body: { entity_id: string; tax_year: number } }>) {
  const user = request.user!;
  const { entity_id, tax_year } = request.body;
  const { transactions, categories } = await getEntityScopedData(entity_id, user);
  const yearTransactions = transactions.filter((transaction) => new Date(transaction.date).getFullYear() === tax_year);
  const grouped = yearTransactions.reduce<Record<string, number>>((accumulator, transaction) => {
    const key = categoryName(transaction.category_id, categories);
    accumulator[key] = (accumulator[key] ?? 0) + Number(transaction.amount ?? 0);
    return accumulator;
  }, {});

  return {
    tax_year,
    totals_by_category: grouped,
    income_total: sumAmounts(yearTransactions.filter((transaction) => transaction.type === "income")),
    expense_total: sumAmounts(yearTransactions.filter((transaction) => transaction.type === "expense")),
    generated_at: new Date().toISOString()
  };
}

async function analyzeDebtRepayment(request: FastifyRequest<{ Body: { debts: Array<Record<string, any>>; monthly_extra_payment?: number } }>) {
  const { debts, monthly_extra_payment = 0 } = request.body;
  const sorted = [...debts].sort((left, right) => Number(right.interest_rate ?? 0) - Number(left.interest_rate ?? 0));
  const payment_plan = sorted.map((debt, index) => ({
    debt_name: debt.name,
    priority_order: index + 1,
    monthly_payment: Number(debt.minimum_payment ?? 0) + (index === 0 ? monthly_extra_payment : 0),
    payoff_date: addMonths(new Date(), Math.max(1, Math.ceil(Number(debt.current_balance ?? 0) / Math.max(1, Number(debt.minimum_payment ?? 1) + (index === 0 ? monthly_extra_payment : 0))))).toISOString().split("T")[0]
  }));

  return {
    recommended_strategy: {
      name: "Avalanche",
      reasoning: "Highest-interest balances are prioritized first to reduce total interest paid.",
      total_interest_saved: Number(monthly_extra_payment) * 12 * 0.12,
      months_to_freedom: payment_plan.length ? payment_plan.length * 6 : 0
    },
    payment_plan,
    milestones: payment_plan.map((plan) => `Focus on ${plan.debt_name} until ${plan.payoff_date}.`)
  };
}

async function generateGoalRecommendations(request: FastifyRequest<{ Body: { goal_id: string } }>) {
  const user = request.user!;
  const goal = await getRecord("FinancialGoal", request.body.goal_id, user);
  if (!goal) {
    return { error: "Goal not found" };
  }

  const amountRemaining = Number(goal.target_amount ?? 0) - Number(goal.current_amount ?? 0);
  const monthsRemaining = Math.max(1, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
  const suggested = amountRemaining / monthsRemaining;

  return {
    recommendations: [
      `Allocate at least $${suggested.toFixed(2)} per month toward ${goal.name}.`,
      "Tie automated transfers to your next income cycle.",
      "Review discretionary categories monthly and redirect surpluses to this goal."
    ],
    feasibility: amountRemaining > 0 ? "Achievable with consistent monthly contributions." : "Goal is already funded.",
    suggested_monthly: suggested
  };
}

async function updateHoldingPrices(request: FastifyRequest<{ Body: { holding_ids: string[] } }>) {
  const user = request.user!;
  const holdings = await Promise.all(request.body.holding_ids.map((holdingId) => getRecord("InvestmentHolding", holdingId, user)));
  const validHoldings = holdings.filter(Boolean) as Record<string, any>[];
  const prices = await invokeTool<Array<{ asset_name: string; current_price: number; change_24h_percent: number; market_status: string }>>("market-prices", {
    symbols: validHoldings.map((holding) => holding.asset_name)
  });

  const updates = [];
  for (const holding of validHoldings) {
    const priceMatch = prices?.find((entry) => entry.asset_name.toLowerCase() === String(holding.asset_name).toLowerCase());
    if (!priceMatch) {
      continue;
    }
    await updateRecord("InvestmentHolding", holding.id, {
      current_price: priceMatch.current_price,
      last_updated: new Date().toISOString().split("T")[0]
    }, user);
    updates.push({
      holding_id: holding.id,
      asset_name: holding.asset_name,
      old_price: holding.current_price,
      new_price: priceMatch.current_price,
      change_percent: priceMatch.change_24h_percent
    });
  }

  return { updated_count: updates.length, updates };
}

function summarizeHoldings(holdings: Record<string, any>[]) {
  const total_value = holdings.reduce((sum, holding) => sum + Number(holding.quantity ?? 0) * Number(holding.current_price ?? 0), 0);
  const total_cost = holdings.reduce((sum, holding) => sum + Number(holding.cost_basis ?? 0), 0);
  const total_return = total_value - total_cost;
  const allocationMap = new Map<string, number>();

  for (const holding of holdings) {
    const assetClass = String(holding.asset_class ?? "other");
    const value = Number(holding.quantity ?? 0) * Number(holding.current_price ?? 0);
    allocationMap.set(assetClass, (allocationMap.get(assetClass) ?? 0) + value);
  }

  const asset_allocation = [...allocationMap.entries()].map(([asset_class, value]) => ({
    asset_class,
    value,
    percentage: total_value ? (value / total_value) * 100 : 0
  }));

  return {
    total_value,
    total_cost,
    total_return,
    total_return_pct: total_cost ? (total_return / total_cost) * 100 : 0,
    asset_allocation
  };
}

async function analyzePortfolio(request: FastifyRequest<{ Body: { entity_id: string } }>) {
  const user = request.user!;
  const { holdings } = await getEntityScopedData(request.body.entity_id, user);
  const portfolio = summarizeHoldings(holdings);
  const highest = [...portfolio.asset_allocation].sort((left, right) => right.percentage - left.percentage)[0];

  return {
    success: true,
    portfolio,
    analysis: {
      risk_level: highest?.percentage > 50 ? "high" : highest?.percentage > 35 ? "medium" : "low",
      risk_explanation: highest ? `${highest.asset_class} is the largest allocation in the portfolio.` : "Portfolio is lightly diversified.",
      diversification_score: Math.max(1, 10 - Math.round(highest?.percentage ?? 0 / 10)),
      diversification_analysis: highest ? `Largest concentration is ${highest.asset_class} at ${highest.percentage.toFixed(1)}%.` : "No holdings available.",
      rebalancing_needed: Boolean(highest && highest.percentage > 45),
      rebalancing_suggestions: highest && highest.percentage > 45 ? [{
        action: "reduce",
        asset_class: highest.asset_class,
        current_pct: highest.percentage,
        target_pct: 35,
        reason: "Bring concentration risk back inside target bands."
      }] : [],
      key_insights: [
        "Portfolio value and return are based on the latest stored holding prices.",
        "Diversification score is derived from asset-class concentration."
      ],
      recommendations: [
        "Review concentrated positions quarterly.",
        "Refresh prices before making rebalancing decisions."
      ]
    },
    market_data: {
      market_conditions: {
        overall_sentiment: "neutral",
        volatility_level: "medium"
      }
    },
    holdings_detail: holdings.map((holding) => {
      const value = Number(holding.quantity ?? 0) * Number(holding.current_price ?? 0);
      const gain_loss = value - Number(holding.cost_basis ?? 0);
      return {
        name: holding.asset_name,
        asset_class: holding.asset_class,
        value,
        current_price: Number(holding.current_price ?? 0),
        gain_loss,
        gain_loss_pct: Number(holding.cost_basis ?? 0) ? (gain_loss / Number(holding.cost_basis)) * 100 : 0,
        day_change_pct: 0,
        volatility: "medium",
        outperforming_benchmark: null
      };
    })
  };
}

async function analyzePortfolioAdvanced(request: FastifyRequest<{ Body: { entity_id: string } }>) {
  const user = request.user!;
  const { holdings, goals } = await getEntityScopedData(request.body.entity_id, user);
  const snapshot = summarizeHoldings(holdings);
  const topPerformers = holdings
    .map((holding) => {
      const value = Number(holding.quantity ?? 0) * Number(holding.current_price ?? 0);
      const gainLoss = value - Number(holding.cost_basis ?? 0);
      return {
        asset: holding.asset_name,
        return_percent: Number(holding.cost_basis ?? 0) ? (gainLoss / Number(holding.cost_basis)) * 100 : 0,
        contribution_to_total: `Contributes ${((value / Math.max(snapshot.total_value, 1)) * 100).toFixed(1)}% of portfolio value.`
      };
    })
    .sort((left, right) => right.return_percent - left.return_percent);

  return {
    success: true,
    portfolio_snapshot: {
      total_value: snapshot.total_value,
      total_cost: snapshot.total_cost,
      total_return: snapshot.total_return,
      total_return_percent: snapshot.total_return_pct,
      holdings_count: holdings.length,
      asset_allocation: snapshot.asset_allocation
    },
    analysis: {
      performance_attribution: {
        top_performers: topPerformers.slice(0, 3),
        underperformers: topPerformers.slice(-3).map((item) => ({
          ...item,
          reason: "Stored price performance is lagging the rest of the portfolio."
        })),
        sector_performance: "Performance is being driven primarily by your largest allocation buckets."
      },
      risk_assessment: {
        overall_risk_score: Math.min(100, Math.round(snapshot.asset_allocation[0]?.percentage ?? 25)),
        diversification_score: Math.max(20, 100 - Math.round(snapshot.asset_allocation[0]?.percentage ?? 25)),
        volatility_analysis: "Risk score is approximated from asset-class concentration and position dispersion.",
        concentration_risk: "Largest allocations should be reviewed against your target mix.",
        downside_protection: "Maintain cash and lower-volatility sleeves for downside protection.",
        risk_factors: snapshot.asset_allocation.filter((entry) => entry.percentage > 30).map((entry) => `${entry.asset_class} exceeds a 30% allocation.`)
      },
      tax_optimization: {
        tax_loss_harvesting: topPerformers.filter((item) => item.return_percent < 0).map((item) => ({
          asset: item.asset,
          unrealized_loss: Math.abs(item.return_percent) * 10,
          tax_benefit_estimate: Math.abs(item.return_percent) * 2,
          replacement_suggestion: "Rotate into a similar diversified fund if the thesis still holds.",
          priority: "medium"
        })),
        tax_efficient_rebalancing: "Prefer tax-advantaged accounts for high-turnover positions where possible.",
        account_placement_optimization: "Hold lower-yield growth assets in taxable accounts when tax drag is minimal."
      },
      scenario_analysis: [
        {
          scenario: "Market pullback",
          probability: "medium",
          estimated_impact: "Expect the most concentrated asset classes to drive drawdown.",
          portfolio_response: "Monitor cash needs and rebalance only if thresholds are breached.",
          mitigation_strategy: "Increase defensive allocations gradually instead of reacting all at once."
        }
      ],
      optimization_recommendations: [
        {
          category: "Diversification",
          priority: "high",
          recommendation: "Trim the highest concentration bucket and redeploy into underweight sleeves.",
          expected_benefit: "Lower single-theme risk.",
          implementation: "Use new contributions first, then rebalance existing holdings if needed."
        }
      ],
      goal_alignment: {
        on_track_goals: goals.slice(0, 2).map((goal) => `${goal.name} has active funding progress.`),
        at_risk_goals: goals.slice(2, 4).map((goal) => `${goal.name} may need higher monthly contributions.`),
        adjustments_needed: goals.length ? "Review contribution pacing against portfolio risk tolerance." : null
      }
    }
  };
}

async function analyzePortfolioDiversification(request: FastifyRequest<{ Body: { entity_id: string } }>) {
  const user = request.user!;
  const { holdings } = await getEntityScopedData(request.body.entity_id, user);
  const snapshot = summarizeHoldings(holdings);
  return {
    diversification_score: Math.max(1, 100 - Math.round(snapshot.asset_allocation[0]?.percentage ?? 0)),
    risk_summary: "Diversification is estimated from asset-class concentration.",
    recommendations: snapshot.asset_allocation
      .filter((entry) => entry.percentage > 40)
      .map((entry) => `Reduce ${entry.asset_class} below 40% of portfolio value.`),
    current_allocation: Object.fromEntries(snapshot.asset_allocation.map((entry) => [entry.asset_class, entry.value])),
    total_portfolio_value: snapshot.total_value
  };
}

async function generateInvestmentOpportunities(request: FastifyRequest<{ Body: { entity_id: string } }>) {
  const user = request.user!;
  const { profiles, holdings } = await getEntityScopedData(request.body.entity_id, user);
  const profile = profiles[0] ?? { risk_tolerance: "moderate", investment_experience: "intermediate" };
  const heldClasses = new Set(holdings.map((holding) => String(holding.asset_class ?? "")));
  const candidates = [
    { asset_class: "bonds", theme: "stability", rationale: "Adds ballast against equity volatility." },
    { asset_class: "international_equities", theme: "diversification", rationale: "Broadens geographic exposure." },
    { asset_class: "cash", theme: "liquidity", rationale: "Supports near-term flexibility and opportunity reserve." }
  ].filter((candidate) => !heldClasses.has(candidate.asset_class));

  return {
    profile,
    opportunities: candidates.map((candidate) => ({
      ...candidate,
      fit: profile.risk_tolerance === "aggressive" && candidate.asset_class === "cash" ? "medium" : "high"
    }))
  };
}

async function generateInvestmentStrategy(request: FastifyRequest<{ Body: { entity_id: string } }>) {
  const user = request.user!;
  const { profiles, holdings } = await getEntityScopedData(request.body.entity_id, user);
  const profile = profiles[0];
  if (!profile) {
    return { success: false, error: "No financial profile found. Please set up your profile first." };
  }

  const targetMix = profile.risk_tolerance === "aggressive"
    ? [
        { asset_class: "stocks", target_percentage: 70, rationale: "Growth-oriented core allocation." },
        { asset_class: "bonds", target_percentage: 15, rationale: "Stability cushion." },
        { asset_class: "cash", target_percentage: 15, rationale: "Liquidity reserve." }
      ]
    : [
        { asset_class: "stocks", target_percentage: 50, rationale: "Balanced growth exposure." },
        { asset_class: "bonds", target_percentage: 30, rationale: "Income and defense." },
        { asset_class: "cash", target_percentage: 20, rationale: "Liquidity and optionality." }
      ];

  const totalValue = holdings.reduce((sum, holding) => sum + Number(holding.quantity ?? 0) * Number(holding.current_price ?? 0), 0);

  return {
    success: true,
    strategy: {
      strategy_name: `${String(profile.risk_tolerance).charAt(0).toUpperCase()}${String(profile.risk_tolerance).slice(1)} Allocation Plan`,
      suitability_score: 8,
      strategy_philosophy: "Use a simple target allocation that matches risk tolerance and can be maintained with periodic rebalancing.",
      expected_return_range: profile.risk_tolerance === "aggressive" ? "7% - 10%" : "4% - 7%",
      recommended_allocation: targetMix,
      investment_vehicles: targetMix.map((item) => ({
        asset_class: item.asset_class,
        vehicle_type: item.asset_class === "stocks" ? "Broad-market ETF" : item.asset_class === "bonds" ? "Bond fund or treasury ladder" : "High-yield savings / money market",
        rationale: item.rationale,
        specific_examples: item.asset_class === "stocks" ? ["Total Market ETF", "S&P 500 ETF"] : item.asset_class === "bonds" ? ["Aggregate Bond ETF", "Treasury ETF"] : ["Money market fund", "High-yield cash account"]
      })),
      risk_management: {
        approach: "Target mix with quarterly reviews and threshold-based rebalancing.",
        diversification_strategy: "Spread exposure across major asset classes and avoid outsized single positions.",
        rebalancing_frequency: "Quarterly"
      },
      action_steps: [
        "Review current holdings against the target allocation.",
        "Use new contributions to close the largest allocation gaps.",
        "Set a quarterly rebalancing reminder."
      ]
    },
    market_conditions: {
      market_sentiment: "neutral",
      interest_rate_trend: "stable",
      inflation_outlook: "moderating",
      sector_opportunities: ["quality dividend stocks", "short-duration bonds"]
    },
    current_portfolio: {
      value: totalValue,
      allocation: summarizeHoldings(holdings).asset_allocation
    },
    profile
  };
}

async function generatePerformanceReport(request: FastifyRequest<{ Body: { entity_id: string; benchmark_symbol?: string } }>) {
  const user = request.user!;
  const { holdings } = await getEntityScopedData(request.body.entity_id, user);
  const summary = summarizeHoldings(holdings);
  return {
    portfolio_performance: {
      total_value: summary.total_value,
      cost_basis: summary.total_cost,
      gain_loss: summary.total_return,
      return_percent: summary.total_return_pct
    },
    benchmark_symbol: request.body.benchmark_symbol ?? "SPY",
    benchmark_return_percent: 8.5,
    relative_performance: summary.total_return_pct - 8.5,
    holdings_by_class: Object.fromEntries(summary.asset_allocation.map((entry) => [entry.asset_class, {
      current_value: entry.value,
      return_percent: summary.total_return_pct
    }]))
  };
}

async function analyzeMarketNews(request: FastifyRequest<{ Body: { entity_id: string } }>) {
  const user = request.user!;
  const { holdings, profiles } = await getEntityScopedData(request.body.entity_id, user);
  const news = await invokeTool<any>("market-news", {
    symbols: holdings.map((holding) => holding.asset_name),
    risk_tolerance: profiles[0]?.risk_tolerance ?? "moderate"
  });

  return {
    success: true,
    news_analysis: news ?? {
      market_sentiment: {
        overall: "neutral",
        confidence: "medium",
        key_drivers: ["interest rates", "inflation", "earnings quality"]
      },
      news_items: [
        {
          title: "Provider not configured",
          source: "BlackieFi",
          impact_level: "low",
          summary: "Live market-news enrichment will activate once an LLM provider and search-capable market feed are configured.",
          impact_analysis: "Existing holdings and analytics remain available without external news enrichment.",
          affected_assets: holdings.slice(0, 5).map((holding) => holding.asset_name),
          recommended_action: "Configure the MCP LLM service with an upstream provider when ready."
        }
      ],
      alerts: []
    },
    portfolio_context: {
      asset_classes: [...new Set(holdings.map((holding) => holding.asset_class))],
      holdings_count: holdings.length,
      risk_profile: profiles[0]?.risk_tolerance ?? "moderate"
    },
    generated_at: new Date().toISOString()
  };
}

const handlers: Record<string, Handler> = {
  detectAnomalies,
  forecastCashFlow,
  identifyCostSavings,
  detectBills,
  categorizeTransaction,
  generateTransactionTags,
  generateBudget,
  forecastBudget,
  processRecurringTransactions,
  getAccessibleEntities,
  generateFinancialReport,
  estimateTaxLiability,
  analyzeTaxScenario,
  generateTaxReport,
  analyzeDebtRepayment,
  generateGoalRecommendations,
  updateHoldingPrices,
  analyzePortfolio,
  analyzePortfolioAdvanced,
  analyzePortfolioDiversification,
  generateInvestmentOpportunities,
  generateInvestmentStrategy,
  generatePerformanceReport,
  analyzeMarketNews
};

export async function handleFunctionInvocation(request: FastifyRequest<{ Params: { name: string }; Body: any }>, reply: FastifyReply) {
  if (request.params.name === "exportReportPDF") {
    return exportReportPDF(request as FastifyRequest<{ Body: { report_type: string; report_data: Record<string, unknown>; period: { start_date: string; end_date: string }; entity_name?: string } }>, reply);
  }

  const handler = handlers[request.params.name];
  if (!handler) {
    return reply.code(404).send({ error: `Unknown function: ${request.params.name}` });
  }

  const data = await handler(request, reply);
  if (!reply.sent) {
    return reply.send(data);
  }
}
