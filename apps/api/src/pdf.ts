import PDFDocument from "pdfkit";

export async function buildReportPdf(input: {
  reportType: string;
  reportData: Record<string, unknown>;
  period: { start_date: string; end_date: string };
  entityName?: string;
}) {
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(20).text("BlackieFi Financial Report");
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Report Type: ${input.reportType}`);
    doc.text(`Entity: ${input.entityName ?? "All"}`);
    doc.text(`Period: ${input.period.start_date} to ${input.period.end_date}`);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown();

    doc.fontSize(12).text(JSON.stringify(input.reportData, null, 2));
    doc.end();
  });
}
