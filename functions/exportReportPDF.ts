import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_type, report_data, period, entity_name } = await req.json();

    const doc = new jsPDF();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.text('BlackieFi Financial Report', 20, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Report Type: ${report_type.replace(/_/g, ' ').toUpperCase()}`, 20, yPos);
    yPos += 7;
    doc.text(`Entity: ${entity_name || 'All'}`, 20, yPos);
    yPos += 7;
    doc.text(`Period: ${period.start_date} to ${period.end_date}`, 20, yPos);
    yPos += 7;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 15;

    doc.setFontSize(10);

    // Profit & Loss Report
    if (report_type === 'profit_loss') {
      doc.setFontSize(14);
      doc.text('Income', 20, yPos);
      yPos += 7;
      doc.setFontSize(10);

      Object.entries(report_data.income || {}).forEach(([cat, amount]) => {
        doc.text(`${cat}`, 25, yPos);
        doc.text(`$${amount.toFixed(2)}`, 150, yPos);
        yPos += 6;
      });

      doc.setFontSize(12);
      doc.text('Total Income:', 25, yPos);
      doc.text(`$${report_data.total_income.toFixed(2)}`, 150, yPos);
      yPos += 10;

      doc.setFontSize(14);
      doc.text('Expenses', 20, yPos);
      yPos += 7;
      doc.setFontSize(10);

      Object.entries(report_data.expenses || {}).forEach(([cat, amount]) => {
        doc.text(`${cat}`, 25, yPos);
        doc.text(`$${amount.toFixed(2)}`, 150, yPos);
        yPos += 6;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });

      doc.setFontSize(12);
      doc.text('Total Expenses:', 25, yPos);
      doc.text(`$${report_data.total_expenses.toFixed(2)}`, 150, yPos);
      yPos += 10;

      doc.setFontSize(14);
      doc.text('Net Income:', 25, yPos);
      doc.text(`$${report_data.net_income.toFixed(2)}`, 150, yPos);
    }

    // Balance Sheet
    if (report_type === 'balance_sheet') {
      doc.setFontSize(14);
      doc.text('Assets', 20, yPos);
      yPos += 7;
      doc.setFontSize(10);

      Object.entries(report_data.assets || {}).forEach(([type, amount]) => {
        doc.text(`${type.replace(/_/g, ' ')}`, 25, yPos);
        doc.text(`$${amount.toFixed(2)}`, 150, yPos);
        yPos += 6;
      });

      doc.setFontSize(12);
      doc.text('Total Assets:', 25, yPos);
      doc.text(`$${report_data.total_assets.toFixed(2)}`, 150, yPos);
      yPos += 10;

      doc.setFontSize(14);
      doc.text('Liabilities', 20, yPos);
      yPos += 7;
      doc.setFontSize(10);

      Object.entries(report_data.liabilities || {}).forEach(([type, amount]) => {
        doc.text(`${type.replace(/_/g, ' ')}`, 25, yPos);
        doc.text(`$${amount.toFixed(2)}`, 150, yPos);
        yPos += 6;
      });

      doc.setFontSize(12);
      doc.text('Total Liabilities:', 25, yPos);
      doc.text(`$${report_data.total_liabilities.toFixed(2)}`, 150, yPos);
      yPos += 10;

      doc.setFontSize(14);
      doc.text('Equity:', 25, yPos);
      doc.text(`$${report_data.equity.toFixed(2)}`, 150, yPos);
    }

    // Cash Flow
    if (report_type === 'cash_flow') {
      doc.setFontSize(14);
      doc.text('Monthly Cash Flow', 20, yPos);
      yPos += 10;
      doc.setFontSize(10);

      Object.entries(report_data.monthly_cash_flow || {}).forEach(([month, data]) => {
        doc.text(month, 25, yPos);
        doc.text(`In: $${data.income.toFixed(2)}`, 80, yPos);
        doc.text(`Out: $${data.expenses.toFixed(2)}`, 130, yPos);
        doc.text(`Net: $${data.net.toFixed(2)}`, 170, yPos);
        yPos += 6;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });

      yPos += 5;
      doc.setFontSize(12);
      doc.text('Total Cash In:', 25, yPos);
      doc.text(`$${report_data.total_cash_in.toFixed(2)}`, 150, yPos);
      yPos += 7;
      doc.text('Total Cash Out:', 25, yPos);
      doc.text(`$${report_data.total_cash_out.toFixed(2)}`, 150, yPos);
      yPos += 7;
      doc.setFontSize(14);
      doc.text('Net Cash Flow:', 25, yPos);
      doc.text(`$${report_data.net_cash_flow.toFixed(2)}`, 150, yPos);
    }

    // Budget vs Actual
    if (report_type === 'budget_vs_actual') {
      doc.setFontSize(14);
      doc.text('Category Comparison', 20, yPos);
      yPos += 10;
      doc.setFontSize(10);

      (report_data.categories || []).forEach(cat => {
        doc.text(cat.category_name, 25, yPos);
        doc.text(`Budget: $${cat.budgeted.toFixed(2)}`, 80, yPos);
        doc.text(`Actual: $${cat.actual.toFixed(2)}`, 130, yPos);
        doc.text(`Var: $${cat.variance.toFixed(2)}`, 170, yPos);
        yPos += 6;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });

      yPos += 5;
      doc.setFontSize(12);
      doc.text('Total Variance:', 25, yPos);
      doc.text(`$${report_data.total_variance.toFixed(2)}`, 150, yPos);
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=${report_type}_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });

  } catch (error) {
    console.error('Error exporting PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});