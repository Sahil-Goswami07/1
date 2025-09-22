import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import crypto from 'crypto';

export async function generatePdfReport(reportJson) {
  const id = reportJson.id || crypto.randomUUID();
  const reportsDir = path.resolve('server/reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const pdfPath = path.join(reportsDir, `${id}.pdf`);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  doc.fontSize(20).text('EduAuth Verification Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Report ID: ${id}`);
  doc.text(`Certificate No: ${reportJson.data?.certNo || 'N/A'}`);
  doc.text(`Status: ${reportJson.status}`);
  doc.text(`Score: ${reportJson.score}`);
  doc.moveDown();

  doc.fontSize(14).text('Parsed Fields', { underline: true });
  Object.entries(reportJson.data || {}).forEach(([k, v]) => {
    doc.fontSize(10).text(`${k}: ${v}`);
  });

  doc.moveDown();
  doc.fontSize(14).text('Signals', { underline: true });
  Object.entries(reportJson.signals || {}).forEach(([k, v]) => {
    doc.fontSize(10).text(`${k}: ${JSON.stringify(v)}`);
  });

  const qrData = JSON.stringify({ id, status: reportJson.status, score: reportJson.score });
  const qrPng = await QRCode.toBuffer(qrData, { type: 'png' });
  doc.addPage();
  doc.fontSize(16).text('Scan to verify summary', { align: 'center' });
  doc.image(qrPng, doc.page.width / 2 - 75, 150, { width: 150, height: 150 });

  doc.end();
  await new Promise((resolve) => stream.on('finish', resolve));
  return { id, pdfPath };
}
