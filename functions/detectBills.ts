import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id } = await req.json();

    // Fetch recent transactions
    const transactions = await base44.entities.Transaction.filter(
      { entity_id, type: 'expense' },
      '-date',
      200
    );

    // Fetch categories
    const categories = await base44.entities.Category.list();

    // Prepare transaction data for AI analysis
    const transactionSummary = transactions.slice(0, 50).map(t => ({
      description: t.description,
      amount: t.amount,
      date: t.date,
      category: categories.find(c => c.id === t.category_id)?.name || 'Uncategorized'
    }));

    // Use AI to detect recurring bills
    const prompt = `You are a financial assistant analyzing transaction history to detect recurring bills and subscriptions.

Transaction History (last 50 transactions):
${transactionSummary.map(t => `- ${t.date}: ${t.description} - $${t.amount} (${t.category})`).join('\n')}

Identify recurring bills/subscriptions that appear monthly, quarterly, or yearly. Look for:
- Utility bills (electric, water, gas, internet)
- Subscription services (streaming, software, memberships)
- Insurance payments
- Loan payments
- Rent/mortgage

For each detected bill, provide:
- Name (clear, user-friendly)
- Typical amount (average)
- Frequency (monthly, quarterly, yearly)
- Estimated next due date (based on pattern)
- Category suggestion`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          detected_bills: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                typical_amount: { type: "number" },
                frequency: { type: "string", enum: ["monthly", "quarterly", "yearly"] },
                estimated_next_due: { type: "string" },
                category_name: { type: "string" },
                confidence: { type: "string", enum: ["high", "medium", "low"] }
              },
              required: ["name", "typical_amount", "frequency", "estimated_next_due"]
            }
          }
        },
        required: ["detected_bills"]
      }
    });

    // Filter high confidence bills and create them
    const createdBills = [];
    for (const bill of aiResponse.detected_bills) {
      if (bill.confidence === 'high' || bill.confidence === 'medium') {
        const category = categories.find(c => 
          c.name.toLowerCase().includes(bill.category_name?.toLowerCase() || '')
        );

        const newBill = await base44.entities.Bill.create({
          entity_id,
          name: bill.name,
          typical_amount: bill.typical_amount,
          due_date: bill.estimated_next_due,
          frequency: bill.frequency,
          auto_detected: true,
          status: 'upcoming',
          category_id: category?.id || null,
          payment_history: []
        });

        createdBills.push(newBill);
      }
    }

    return Response.json({
      success: true,
      detected_count: aiResponse.detected_bills.length,
      created_count: createdBills.length,
      bills: createdBills
    });

  } catch (error) {
    console.error('Bill detection error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});