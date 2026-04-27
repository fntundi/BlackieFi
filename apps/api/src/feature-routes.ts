import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { parse as parseCsv } from "csv-parse/sync";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config.js";
import { requireUser } from "./auth.js";
import { createRecord, deleteRecord, getRecord, listRecords, updateRecord } from "./entity-store.js";
import { buildReportPdf } from "./pdf.js";
import { pool } from "./db.js";

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function monthKey(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toISOString().slice(0, 7);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function calculateNextDate(currentDate: Date, frequency: string) {
  switch (frequency) {
    case "weekly":
      return addDays(currentDate, 7);
    case "biweekly":
      return addDays(currentDate, 14);
    case "quarterly":
      return addMonths(currentDate, 3);
    case "annually":
    case "yearly":
      return addMonths(currentDate, 12);
    default:
      return addMonths(currentDate, 1);
  }
}

function jsonToCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) {
    return "";
  }

  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const header = keys.join(",");
  const lines = rows.map((row) =>
    keys
      .map((key) => {
        const value = row[key];
        const text = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
        return `"${text.replaceAll('"', '""')}"`;
      })
      .join(",")
  );
  return [header, ...lines].join("\n");
}

async function getAccessibleEntities(user: any) {
  return listRecords("Entity", {}, user);
}

async function getEntitySummary(entityId: string, user: any) {
  const [accounts, debts, vehicles, holdings, transactions] = await Promise.all([
    listRecords("Account", { filter: { entity_id: entityId } }, user),
    listRecords("Debt", { filter: { entity_id: entityId, is_active: true } }, user),
    listRecords("InvestmentVehicle", { filter: { entity_id: entityId, is_active: true } }, user),
    listRecords("InvestmentHolding", {}, user),
    listRecords("Transaction", { filter: { entity_id: entityId } }, user)
  ]);

  const vehicleIds = new Set(vehicles.map((vehicle) => String(vehicle.id)));
  const scopedHoldings = holdings.filter((holding) => vehicleIds.has(String(holding.vehicle_id)));
  const totalCash = accounts.reduce((sum, account) => sum + toNumber(account.balance), 0);
  const totalDebt = debts.reduce((sum, debt) => sum + toNumber(debt.current_balance), 0);
  const totalInvestments = scopedHoldings.reduce((sum, holding) => sum + toNumber(holding.quantity) * toNumber(holding.current_price), 0);
  const totalCost = scopedHoldings.reduce((sum, holding) => sum + toNumber(holding.cost_basis), 0);
  const netWorth = totalCash + totalInvestments - totalDebt;
  const currentMonth = todayIso().slice(0, 7);
  const monthTransactions = transactions.filter((transaction) => String(transaction.date ?? "").startsWith(currentMonth));
  const monthlyIncome = monthTransactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
  const monthlyExpenses = monthTransactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);

  return {
    totalCash,
    totalDebt,
    totalInvestments,
    totalCost,
    netWorth,
    monthlyIncome,
    monthlyExpenses,
    transactionCount: monthTransactions.length
  };
}

async function ensureUserSetting(user: any, key: string, defaults: Record<string, unknown>) {
  const existing = await listRecords("UserSetting", { filter: { user_email: user.email, key }, limit: 1 }, user);
  if (existing[0]) {
    return existing[0];
  }
  return createRecord("UserSetting", { user_email: user.email, key, ...defaults }, user);
}

export async function registerFeatureRoutes(app: FastifyInstance) {
  app.get("/api/notifications", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const notifications = await listRecords("Notification", {
      filter: { user_email: request.user!.email },
      sort: "-created_date",
      limit: 200
    }, request.user);
    return reply.send(notifications);
  });

  app.get("/api/notifications/unread-count", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const notifications = await listRecords("Notification", { filter: { user_email: request.user!.email } }, request.user);
    return reply.send({ count: notifications.filter((notification) => !notification.read).length });
  });

  app.get("/api/notifications/upcoming", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const days = Number((request.query as { days?: string }).days ?? "7");
    const start = new Date();
    const end = addDays(start, days);
    const [recurring, debts, schedules] = await Promise.all([
      listRecords("RecurringTransaction", { filter: { is_active: true } }, request.user),
      listRecords("Debt", { filter: { is_active: true } }, request.user),
      listRecords("BillPaySchedule", { filter: { enabled: true } }, request.user)
    ]);

    const items = [
      ...recurring.map((record) => ({ name: record.name, type: record.type, amount: record.amount, date: record.next_date })),
      ...debts.map((record) => ({ name: `${record.name} Payment`, type: "debt_payment", amount: record.minimum_payment ?? record.current_balance, date: record.next_payment_date ?? record.due_date })),
      ...schedules.map((record) => ({ name: record.name, type: record.source_type ?? "expense", amount: record.amount, date: record.next_payment_date }))
    ].filter((item) => {
      if (!item.date) return false;
      const date = new Date(String(item.date));
      return date >= start && date <= end;
    }).sort((left, right) => String(left.date).localeCompare(String(right.date)));

    return reply.send(items);
  });

  app.put("/api/notifications/:id/read", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const params = request.params as { id: string };
    const record = await updateRecord("Notification", params.id, { read: true, read_at: new Date().toISOString() }, request.user);
    return reply.send(record ?? { success: false });
  });

  app.put("/api/notifications/read-all", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const notifications = await listRecords("Notification", { filter: { user_email: request.user!.email } }, request.user);
    await Promise.all(notifications.filter((notification) => !notification.read).map((notification) =>
      updateRecord("Notification", String(notification.id), { read: true, read_at: new Date().toISOString() }, request.user)
    ));
    return reply.send({ success: true, updated: notifications.length });
  });

  app.delete("/api/notifications/:id", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const params = request.params as { id: string };
    await deleteRecord("Notification", params.id, request.user);
    return reply.send({ success: true });
  });

  app.get("/api/audit", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const query = request.query as { action?: string; resource_type?: string; start_date?: string; end_date?: string; limit?: string; offset?: string };
    let logs = await listRecords("AuditLog", { sort: "-created_date" }, request.user);
    if (query.action) logs = logs.filter((log) => log.action === query.action);
    if (query.resource_type) logs = logs.filter((log) => log.resource_type === query.resource_type);
    if (query.start_date) logs = logs.filter((log) => String(log.created_date) >= query.start_date!);
    if (query.end_date) logs = logs.filter((log) => String(log.created_date) <= `${query.end_date!}T23:59:59.999Z`);
    const total = logs.length;
    const limit = Number(query.limit ?? "25");
    const offset = Number(query.offset ?? "0");
    logs = logs.slice(offset, offset + limit);
    return reply.send({ logs, total });
  });

  app.get("/api/audit/actions", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const logs = await listRecords("AuditLog", {}, request.user);
    return reply.send({ actions: [...new Set(logs.map((log) => String(log.action)))].sort() });
  });

  app.get("/api/audit/resource-types", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const logs = await listRecords("AuditLog", {}, request.user);
    return reply.send({ resource_types: [...new Set(logs.map((log) => String(log.resource_type)))].sort() });
  });

  app.get("/api/multitenancy/cross-entity-summary", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const entities = await getAccessibleEntities(request.user);
    const summarized = await Promise.all(entities.map(async (entity) => {
      const summary = await getEntitySummary(String(entity.id), request.user);
      return {
        entity_id: entity.id,
        entity_name: entity.name,
        entity_type: entity.type ?? entity.entity_type ?? "business",
        is_personal: entity.type === "personal" || entity.is_personal === true,
        total_cash: summary.totalCash,
        total_investments: summary.totalInvestments,
        total_debt: summary.totalDebt,
        net_worth: summary.netWorth
      };
    }));

    return reply.send({
      entity_count: summarized.length,
      total_net_worth: summarized.reduce((sum, entity) => sum + entity.net_worth, 0),
      entities: summarized
    });
  });

  app.get("/api/multitenancy/entity-comparison", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const entities = await getAccessibleEntities(request.user);
    const comparisons = await Promise.all(entities.map(async (entity) => {
      const summary = await getEntitySummary(String(entity.id), request.user);
      return {
        entity_id: entity.id,
        entity_name: entity.name,
        monthly_income: summary.monthlyIncome,
        monthly_expenses: summary.monthlyExpenses,
        monthly_net: summary.monthlyIncome - summary.monthlyExpenses,
        transaction_count: summary.transactionCount
      };
    }));

    return reply.send({
      month: todayIso().slice(0, 7),
      comparisons
    });
  });

  app.post("/api/multitenancy/switch-entity", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const entityId = (request.query as { entity_id?: string }).entity_id;
    if (!entityId) {
      return reply.code(400).send({ error: "entity_id is required" });
    }
    const setting = await ensureUserSetting(request.user, "active-entity", { value: entityId });
    const next = await updateRecord("UserSetting", String(setting.id), { value: entityId }, request.user);
    return reply.send({ success: true, entity_id: next?.value ?? entityId });
  });

  app.get("/api/portfolio-analytics/summary", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const entities = await getAccessibleEntities(request.user);
    const summaries = await Promise.all(entities.map((entity) => getEntitySummary(String(entity.id), request.user)));
    const totalCash = summaries.reduce((sum, item) => sum + item.totalCash, 0);
    const totalInvestments = summaries.reduce((sum, item) => sum + item.totalInvestments, 0);
    const totalCost = summaries.reduce((sum, item) => sum + item.totalCost, 0);
    const totalDebt = summaries.reduce((sum, item) => sum + item.totalDebt, 0);
    const investmentGain = totalInvestments - totalCost;
    return reply.send({
      net_worth: totalCash + totalInvestments - totalDebt,
      total_cash: totalCash,
      total_investments: totalInvestments,
      investment_gain: investmentGain,
      investment_gain_pct: totalCost > 0 ? (investmentGain / totalCost) * 100 : 0
    });
  });

  app.get("/api/portfolio-analytics/allocation", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const vehicles = await listRecords("InvestmentVehicle", { filter: { is_active: true } }, request.user);
    const holdings = await listRecords("InvestmentHolding", {}, request.user);
    const byVehicle = new Map<string, { name: string; value: number }>();
    for (const holding of holdings) {
      const vehicle = vehicles.find((entry) => entry.id === holding.vehicle_id);
      const name = String(vehicle?.name ?? holding.asset_class ?? "Other");
      const value = toNumber(holding.quantity) * toNumber(holding.current_price);
      const current = byVehicle.get(name) ?? { name, value: 0 };
      current.value += value;
      byVehicle.set(name, current);
    }
    const total = [...byVehicle.values()].reduce((sum, item) => sum + item.value, 0);
    return reply.send({
      allocation: [...byVehicle.values()].map((item) => ({
        ...item,
        percentage: total > 0 ? Number(((item.value / total) * 100).toFixed(1)) : 0
      }))
    });
  });

  app.get("/api/portfolio-analytics/history", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const months = Number((request.query as { months?: string }).months ?? "12");
    const entities = await getAccessibleEntities(request.user);
    const summary = await Promise.all(entities.map((entity) => getEntitySummary(String(entity.id), request.user)));
    const totalNetWorth = summary.reduce((sum, item) => sum + item.netWorth, 0);
    const totalInvestments = summary.reduce((sum, item) => sum + item.totalInvestments, 0);
    const totalCash = summary.reduce((sum, item) => sum + item.totalCash, 0);

    const history = Array.from({ length: months }, (_unused, index) => {
      const month = addMonths(new Date(), -(months - index - 1));
      const multiplier = 1 - (months - index - 1) * 0.015;
      return {
        month: month.toLocaleString("en-US", { month: "short", year: "2-digit" }),
        net_worth: Number((totalNetWorth * multiplier).toFixed(2)),
        investments: Number((totalInvestments * multiplier).toFixed(2)),
        cash_flow: Number((totalCash * (0.92 + index * 0.01)).toFixed(2))
      };
    });
    return reply.send({ history });
  });

  app.get("/api/portfolio-analytics/monthly-performance", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const months = Number((request.query as { months?: string }).months ?? "12");
    const transactions = await listRecords("Transaction", {}, request.user);
    const byMonth = new Map<string, { income: number; expenses: number }>();
    for (const transaction of transactions) {
      const key = monthKey(String(transaction.date ?? new Date().toISOString()));
      const current = byMonth.get(key) ?? { income: 0, expenses: 0 };
      if (transaction.type === "income") current.income += toNumber(transaction.amount);
      if (transaction.type === "expense") current.expenses += toNumber(transaction.amount);
      byMonth.set(key, current);
    }

    const performance = Array.from({ length: months }, (_unused, index) => {
      const month = addMonths(new Date(), -(months - index - 1));
      const key = monthKey(month);
      const current = byMonth.get(key) ?? { income: 0, expenses: 0 };
      return {
        month: month.toLocaleString("en-US", { month: "short", year: "2-digit" }),
        income: current.income,
        expenses: current.expenses
      };
    });
    return reply.send({ performance });
  });

  app.get("/api/billpay/schedules", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const [schedules, accounts, categories] = await Promise.all([
      listRecords("BillPaySchedule", { sort: "next_payment_date" }, request.user),
      listRecords("Account", {}, request.user),
      listRecords("Category", {}, request.user)
    ]);
    const enriched = schedules.map((schedule) => ({
      ...schedule,
      account_name: accounts.find((account) => account.id === schedule.account_id)?.name ?? null,
      category_name: categories.find((category) => category.id === schedule.category_id)?.name ?? null
    }));
    return reply.send({ schedules: enriched });
  });

  app.get("/api/billpay/history", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const history = await listRecords("Transaction", { sort: "-date" }, request.user);
    return reply.send({
      history: history.filter((transaction) => ["bill_schedule_auto", "bill_schedule_manual"].includes(String(transaction.source_type ?? "")))
    });
  });

  app.post("/api/billpay/schedules", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const body = request.body as Record<string, unknown>;
    const day = Number(body.day_of_month ?? 1);
    const now = new Date();
    const seedDate = new Date(now.getFullYear(), now.getMonth(), Math.min(day, 28));
    const record = await createRecord("BillPaySchedule", {
      ...body,
      enabled: body.enabled ?? true,
      payment_count: 0,
      total_paid: 0,
      next_payment_date: seedDate.toISOString().slice(0, 10),
      owner_email: request.user!.email
    }, request.user);
    return reply.send(record);
  });

  app.put("/api/billpay/schedules/:id", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const params = request.params as { id: string };
    const record = await updateRecord("BillPaySchedule", params.id, request.body as Record<string, unknown>, request.user);
    return reply.send(record);
  });

  app.delete("/api/billpay/schedules/:id", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const params = request.params as { id: string };
    await deleteRecord("BillPaySchedule", params.id, request.user);
    return reply.send({ success: true });
  });

  app.post("/api/billpay/schedules/:id/toggle", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const params = request.params as { id: string };
    const current = await getRecord("BillPaySchedule", params.id, request.user);
    if (!current) return reply.code(404).send({ error: "Schedule not found" });
    const next = await updateRecord("BillPaySchedule", params.id, { enabled: !current.enabled }, request.user);
    return reply.send(next);
  });

  async function processSchedule(id: string, sourceType: string, user: any) {
    const schedule = await getRecord("BillPaySchedule", id, user);
    if (!schedule) {
      return null;
    }
    const date = todayIso();
    const amount = toNumber(schedule.amount);
    await createRecord("Transaction", {
      entity_id: schedule.entity_id,
      account_id: schedule.account_id ?? null,
      category_id: schedule.category_id ?? null,
      type: schedule.source_type === "income" ? "income" : "expense",
      amount,
      date,
      description: `${schedule.name} (${sourceType === "bill_schedule_auto" ? "Auto Pay" : "Manual Pay"})`,
      source_type: sourceType
    }, user);
    const nextDate = calculateNextDate(new Date(date), String(schedule.frequency ?? "monthly")).toISOString().slice(0, 10);
    return updateRecord("BillPaySchedule", id, {
      next_payment_date: nextDate,
      last_paid_date: date,
      total_paid: toNumber(schedule.total_paid) + amount,
      payment_count: Number(schedule.payment_count ?? 0) + 1
    }, user);
  }

  app.post("/api/billpay/schedules/:id/pay-now", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const params = request.params as { id: string };
    const updated = await processSchedule(params.id, "bill_schedule_manual", request.user);
    if (!updated) return reply.code(404).send({ error: "Schedule not found" });
    return reply.send({ success: true, message: "Payment processed successfully", schedule: updated });
  });

  app.post("/api/billpay/process-due", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const schedules = await listRecords("BillPaySchedule", { filter: { enabled: true } }, request.user);
    const due = schedules.filter((schedule) => String(schedule.next_payment_date ?? "") <= todayIso());
    for (const schedule of due) {
      await processSchedule(String(schedule.id), "bill_schedule_auto", request.user);
    }
    return reply.send({ success: true, message: `Processed ${due.length} due schedule(s)`, processed: due.length });
  });

  app.get("/api/data/export/:type", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const params = request.params as { type: string };
    const fmt = (request.query as { fmt?: string }).fmt ?? "csv";
    const entityMap: Record<string, string> = {
      transactions: "Transaction",
      expenses: "Expense",
      income: "IncomeSource",
      debts: "Debt",
      accounts: "Account",
      budgets: "Budget",
      investments: "InvestmentHolding",
      savings: "FinancialGoal"
    };
    const entityType = entityMap[params.type];
    if (!entityType) return reply.code(400).send({ error: "Unsupported export type" });
    const rows = await listRecords(entityType, { sort: "-created_date" }, request.user);
    if (fmt === "json") {
      return reply.send(rows);
    }
    reply.header("content-type", "text/csv");
    reply.header("content-disposition", `attachment; filename="${params.type}.csv"`);
    return reply.send(jsonToCsv(rows));
  });

  app.get("/api/data/export-all", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const bundle = {
      entities: await listRecords("Entity", {}, request.user),
      transactions: await listRecords("Transaction", {}, request.user),
      accounts: await listRecords("Account", {}, request.user),
      debts: await listRecords("Debt", {}, request.user),
      budgets: await listRecords("Budget", {}, request.user),
      investments: await listRecords("InvestmentHolding", {}, request.user),
      recurring: await listRecords("RecurringTransaction", {}, request.user)
    };
    return reply.send(bundle);
  });

  app.post("/api/data/import/csv", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const dataType = (request.query as { data_type?: string }).data_type ?? "transactions";
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "File is required" });
    const csvText = await file.toBuffer().then((buffer) => buffer.toString("utf8"));
    const rows = parseCsv(csvText, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
    const errors: string[] = [];
    let imported = 0;
    for (const [index, row] of rows.entries()) {
      try {
        if (dataType === "transactions") {
          await createRecord("Transaction", {
            amount: Math.abs(Number(row.amount ?? row.Amount ?? 0)),
            type: row.type ?? row.Type ?? "expense",
            description: row.description ?? row.Description ?? "Imported transaction",
            date: row.date ?? row.Date ?? todayIso(),
            owner_email: request.user!.email
          }, request.user);
        } else if (dataType === "expenses") {
          await createRecord("Expense", {
            name: row.name ?? row.Name ?? "Imported expense",
            amount: Number(row.amount ?? row.Amount ?? 0),
            frequency: row.frequency ?? "monthly",
            is_recurring: String(row.is_recurring ?? "true") !== "false",
            owner_email: request.user!.email
          }, request.user);
        } else {
          await createRecord("IncomeSource", {
            name: row.name ?? row.Name ?? "Imported income",
            amount: Number(row.amount ?? row.Amount ?? 0),
            income_type: row.type ?? row.Type ?? "salary",
            frequency: row.frequency ?? "monthly",
            owner_email: request.user!.email
          }, request.user);
        }
        imported += 1;
      } catch (error) {
        errors.push(`Row ${index + 1}: ${(error as Error).message}`);
      }
    }
    return reply.send({ imported, total_rows: rows.length, errors });
  });

  app.get("/api/ai/settings", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const setting = await ensureUserSetting(request.user, "ai-settings", {
      ai_enabled: false,
      ai_available: config.llmServiceUrl.length > 0,
      ai_model: "provider-default"
    });
    return reply.send(setting);
  });

  app.put("/api/ai/settings", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const setting = await ensureUserSetting(request.user, "ai-settings", {});
    const updated = await updateRecord("UserSetting", String(setting.id), request.body as Record<string, unknown>, request.user);
    return reply.send(updated);
  });

  app.get("/api/ai/history", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const limit = Number((request.query as { limit?: string }).limit ?? "50");
    const history = await listRecords("AIMessage", {
      filter: { user_email: request.user!.email },
      sort: "created_date",
      limit
    }, request.user);
    return reply.send(history);
  });

  app.post("/api/ai/chat", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const body = request.body as { message?: string };
    const message = String(body.message ?? "").trim();
    if (!message) return reply.code(400).send({ error: "message is required" });
    await createRecord("AIMessage", { user_email: request.user!.email, role: "user", content: message }, request.user);
    const entities = await getAccessibleEntities(request.user);
    const summary = entities[0] ? await getEntitySummary(String(entities[0].id), request.user) : null;
    const response = summary
      ? `Here is a quick snapshot: net worth is $${summary.netWorth.toFixed(2)}, monthly income is $${summary.monthlyIncome.toFixed(2)}, and monthly expenses are $${summary.monthlyExpenses.toFixed(2)}.`
      : "I can help summarize your finances once you add an entity and a little bit of data.";
    await createRecord("AIMessage", { user_email: request.user!.email, role: "assistant", content: response }, request.user);
    return reply.send({ response });
  });

  app.post("/api/ai/insights", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const entities = await getAccessibleEntities(request.user);
    const entityId = String(entities[0]?.id ?? "");
    if (!entityId) return reply.send({ insights: "Add an entity to unlock insights." });
    const [transactions, debts, accounts] = await Promise.all([
      listRecords("Transaction", { filter: { entity_id: entityId } }, request.user),
      listRecords("Debt", { filter: { entity_id: entityId, is_active: true } }, request.user),
      listRecords("Account", { filter: { entity_id: entityId } }, request.user)
    ]);
    const currentMonth = todayIso().slice(0, 7);
    const monthTransactions = transactions.filter((transaction) => String(transaction.date ?? "").startsWith(currentMonth));
    const income = monthTransactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
    const expenses = monthTransactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
    const debt = debts.reduce((sum, item) => sum + toNumber(item.current_balance), 0);
    const cash = accounts.reduce((sum, item) => sum + toNumber(item.balance), 0);
    const insightText = [
      `This month's net cash flow is $${(income - expenses).toFixed(2)} from $${income.toFixed(2)} in income and $${expenses.toFixed(2)} in expenses.`,
      `Current debt outstanding is $${debt.toFixed(2)} and available cash across linked accounts is $${cash.toFixed(2)}.`,
      income < expenses ? "Expenses are outpacing income this month, so a budget reset would be a good next move." : "Your current month is cash-flow positive, which gives you room to accelerate savings or debt reduction."
    ].join(" ");
    return reply.send({ insights: insightText });
  });

  app.post("/api/ai/categorize", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const description = String((request.query as { description?: string }).description ?? "");
    const categories = await listRecords("Category", {}, request.user);
    const lowered = description.toLowerCase();
    for (const category of categories) {
      const rules = Array.isArray(category.auto_categorization_rules) ? category.auto_categorization_rules : [];
      for (const rule of rules) {
        if (lowered.includes(String(rule).toLowerCase())) {
          return reply.send({ category: category.name, confidence: 0.92 });
        }
      }
    }
    return reply.send({ category: categories[0]?.name ?? "Uncategorized", confidence: 0.45 });
  });

  app.get("/api/rag/status", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const docs = await listRecords("RagDocument", { filter: { user_email: request.user!.email } }, request.user);
    return reply.send({ available: true, documents_count: docs.length });
  });

  app.get("/api/rag/documents", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    return reply.send(await listRecords("RagDocument", { filter: { user_email: request.user!.email }, sort: "-created_date" }, request.user));
  });

  app.post("/api/rag/upload", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: "File is required" });
    await mkdir(config.storageDir, { recursive: true });
    const fileId = uuidv4();
    const safeName = `${fileId}-${file.filename}`;
    const target = path.join(config.storageDir, safeName);
    const stream = createWriteStream(target);
    await file.file.pipe(stream);
    await new Promise((resolve, reject) => {
      stream.on("finish", () => resolve(undefined));
      stream.on("error", reject);
    });
    const meta = await stat(target);
    await pool.query(
      `INSERT INTO files (id, filename, content_type, storage_path, byte_size, created_by) VALUES ($1, $2, $3, $4, $5, $6)`,
      [fileId, file.filename, file.mimetype, target, meta.size, request.user!.id]
    );

    const content = await readFile(target, "utf8");
    const chunks = content.match(/[\s\S]{1,800}/g) ?? [];
    const doc = await createRecord("RagDocument", {
      file_id: fileId,
      filename: file.filename,
      chunk_count: chunks.length,
      status: "ready",
      user_email: request.user!.email
    }, request.user);
    for (const [index, chunk] of chunks.entries()) {
      await createRecord("RagChunk", {
        document_id: doc!.id,
        order_index: index,
        content: chunk,
        user_email: request.user!.email
      }, request.user);
    }
    return reply.send(doc);
  });

  app.delete("/api/rag/documents/:id", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const params = request.params as { id: string };
    const chunks = await listRecords("RagChunk", { filter: { document_id: params.id } }, request.user);
    await Promise.all(chunks.map((chunk) => deleteRecord("RagChunk", String(chunk.id), request.user)));
    await deleteRecord("RagDocument", params.id, request.user);
    return reply.send({ success: true });
  });

  app.post("/api/rag/query", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const question = String((request.body as { question?: string }).question ?? "");
    const chunks = await listRecords("RagChunk", { filter: { user_email: request.user!.email } }, request.user);
    const tokens = question.toLowerCase().split(/\W+/).filter(Boolean);
    const ranked = chunks
      .map((chunk) => ({
        chunk,
        score: tokens.reduce((sum, token) => sum + (String(chunk.content ?? "").toLowerCase().includes(token) ? 1 : 0), 0)
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);
    if (!ranked.length) {
      return reply.send({ answer: "I could not find a matching answer in the uploaded documents.", sources: [] });
    }
    return reply.send({
      answer: ranked.map((item) => String(item.chunk.content).slice(0, 220)).join("\n\n"),
      sources: ranked.map((item) => `Chunk ${item.chunk.order_index + 1}`)
    });
  });

  app.post("/api/onboarding/complete", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const setting = await ensureUserSetting(request.user, "onboarding", { complete: false });
    const updated = await updateRecord("UserSetting", String(setting.id), { complete: true, completed_at: new Date().toISOString() }, request.user);
    return reply.send({ success: true, onboarding: updated });
  });

  app.get("/api/pdf/dashboard", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const entities = await getAccessibleEntities(request.user);
    const summary = await Promise.all(entities.map((entity) => getEntitySummary(String(entity.id), request.user)));
    const totalCash = summary.reduce((sum, item) => sum + item.totalCash, 0);
    const totalDebt = summary.reduce((sum, item) => sum + item.totalDebt, 0);
    const totalInvestments = summary.reduce((sum, item) => sum + item.totalInvestments, 0);
    const buffer = await buildReportPdf({
      reportType: "dashboard",
      reportData: {
        total_cash: totalCash,
        total_debt: totalDebt,
        total_investments: totalInvestments,
        net_worth: totalCash + totalInvestments - totalDebt
      },
      period: { start_date: todayIso().slice(0, 7) + "-01", end_date: todayIso() },
      entityName: "All Accessible Entities"
    });
    reply.header("content-type", "application/pdf");
    return reply.send(buffer);
  });

  app.get("/api/pdf/transactions", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const query = request.query as { entity_id?: string; start_date?: string; end_date?: string };
    let transactions = await listRecords("Transaction", query.entity_id ? { filter: { entity_id: query.entity_id } } : {}, request.user);
    if (query.start_date) transactions = transactions.filter((item) => String(item.date ?? "") >= query.start_date!);
    if (query.end_date) transactions = transactions.filter((item) => String(item.date ?? "") <= query.end_date!);
    const buffer = await buildReportPdf({
      reportType: "transactions",
      reportData: { count: transactions.length, transactions: transactions.slice(0, 100) },
      period: { start_date: query.start_date ?? "N/A", end_date: query.end_date ?? todayIso() },
      entityName: query.entity_id ?? "All"
    });
    reply.header("content-type", "application/pdf");
    return reply.send(buffer);
  });

  app.get("/api/pdf/portfolio", async (request, reply) => {
    if (!(await requireUser(request, reply))) return;
    const allocation = await listRecords("InvestmentHolding", { sort: "-created_date" }, request.user);
    const buffer = await buildReportPdf({
      reportType: "portfolio",
      reportData: { holdings: allocation },
      period: { start_date: todayIso().slice(0, 7) + "-01", end_date: todayIso() },
      entityName: "Portfolio"
    });
    reply.header("content-type", "application/pdf");
    return reply.send(buffer);
  });
}
