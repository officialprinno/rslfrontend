import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Invoice, Quotation } from '../models/sales.model';
import { COMPANY_DETAILS } from '../../modules/sales/constants/sales.constants';
import { formatCurrency, formatDate } from './format.util';
import { generateQrDataUrl } from './qr.util';
import { drawPdfHeaderLogo, drawPdfWatermark } from './brand.util';

const BRAND_RGB: [number, number, number] = [27, 58, 107];
const MARGIN = 14;
const HEADER_TEXT_X = MARGIN + 38;

function addHeader(doc: jsPDF, title: string, docNumber: string): number {
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 32, 'F');
  drawPdfHeaderLogo(doc, MARGIN, 6, 34, 20);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_DETAILS.name, HEADER_TEXT_X, 11);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`TIN: ${COMPANY_DETAILS.tin} | VRN: ${COMPANY_DETAILS.vat}`, HEADER_TEXT_X, 17);
  doc.text(COMPANY_DETAILS.address, HEADER_TEXT_X, 22);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, doc.internal.pageSize.getWidth() - MARGIN, 12, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(docNumber, doc.internal.pageSize.getWidth() - MARGIN, 19, { align: 'right' });
  doc.setTextColor(40, 40, 40);
  return 40;
}

function addMetaGrid(doc: jsPDF, startY: number, rows: [string, string][]): number {
  doc.setFontSize(9);
  const y = startY;
  const colWidth = (doc.internal.pageSize.getWidth() - MARGIN * 2) / 2;
  rows.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * colWidth;
    const lineY = y + row * 12;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 120, 120);
    doc.text(label, x, lineY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(value || '—', x, lineY + 5);
  });
  return y + Math.ceil(rows.length / 2) * 12 + 6;
}

function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated ${formatDate(new Date().toISOString())} — Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );
  }
}

export function exportQuotationPdf(quotation: Quotation): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'QUOTATION', quotation.quotation_number);

  const meta: [string, string][] = [
    ['Customer', quotation.customer_name],
    ['Mine', quotation.mine_name],
    ['Valid Until', formatDate(quotation.valid_until)],
    ['Status', quotation.status],
    ['Currency', quotation.currency_code],
  ];
  if (quotation.currency_code?.toUpperCase() !== 'TZS') {
    meta.push(['Exchange Rate', `1 ${quotation.currency_code} = ${quotation.exchange_rate} TZS`]);
  }
  meta.push(
    ['Prepared By', quotation.created_by_name],
    ['Date', formatDate(quotation.created_at)],
  );

  y = addMetaGrid(doc, y, meta);

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Qty', 'Unit Price', 'Disc %', 'Total']],
    body: quotation.items.map((item) => [
      `${item.item_code ?? ''} — ${item.item_name ?? item.description ?? ''}`,
      String(item.quantity),
      formatCurrency(item.unit_price, quotation.currency_code),
      `${item.discount_percent}%`,
      formatCurrency(item.total_price ?? 0, quotation.currency_code),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND_RGB, textColor: 255 },
    theme: 'striped',
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
  const summaryX = doc.internal.pageSize.getWidth() - MARGIN;
  doc.setFontSize(10);
  doc.text(`Subtotal: ${formatCurrency(quotation.subtotal, quotation.currency_code)}`, summaryX, finalY + 8, {
    align: 'right',
  });
  doc.text(`VAT: ${formatCurrency(quotation.tax_amount, quotation.currency_code)}`, summaryX, finalY + 14, {
    align: 'right',
  });
  const totalY = finalY + 22;
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Grand Total: ${formatCurrency(quotation.total_amount, quotation.currency_code)}`,
    summaryX,
    totalY,
    { align: 'right' },
  );

  if (quotation.terms_conditions || quotation.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Terms & Conditions', MARGIN, totalY + 10);
    doc.setTextColor(80, 80, 80);
    const text = quotation.terms_conditions || quotation.notes;
    const split = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - MARGIN * 2);
    doc.text(split, MARGIN, totalY + 16);
  }

  drawPdfWatermark(doc);
  addFooter(doc);
  doc.save(`${quotation.quotation_number}.pdf`);
}

export async function exportInvoicePdf(invoice: Invoice): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'TAX INVOICE', invoice.invoice_number);

  if (invoice.public_view_url) {
    const qr = await generateQrDataUrl(invoice.public_view_url, 140);
    if (qr) {
      const qrSize = 22;
      const qrX = doc.internal.pageSize.getWidth() - MARGIN - qrSize;
      doc.addImage(qr, 'PNG', qrX, 34, qrSize, qrSize);
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('Scan to view invoice', qrX + qrSize / 2, 34 + qrSize + 3, { align: 'center' });
      doc.setTextColor(40, 40, 40);
    }
  }

  const meta: [string, string][] = [
    ['Customer', invoice.customer_name],
    ['Customer TIN', invoice.customer_tin],
    ['Sales Order', invoice.so_number ?? '—'],
    ['Invoice Date', formatDate(invoice.invoice_date)],
    ['Due Date', formatDate(invoice.due_date)],
    ['Payment Terms', invoice.payment_term_display || invoice.payment_term || '—'],
    ['TRA Receipt No.', invoice.tra_receipt_number || '—'],
    ['Currency', invoice.currency_code],
  ];
  if (invoice.deposit_amount) {
    meta.push(['Deposit Required', formatCurrency(invoice.deposit_amount, invoice.currency_code)]);
  }
  if (invoice.credit_days) {
    meta.push(['Credit Days', String(invoice.credit_days)]);
  }
  if (invoice.currency_code?.toUpperCase() !== 'TZS') {
    meta.push(['Exchange Rate', `1 ${invoice.currency_code} = ${invoice.exchange_rate} TZS`]);
  }
  meta.push(['Status', invoice.status]);

  y = addMetaGrid(doc, y, meta);

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Qty', 'Unit Price', 'Disc %', 'Tax %', 'Total']],
    body: invoice.items.map((item) => [
      `${item.item_code ?? ''} — ${item.item_name ?? ''}`,
      String(item.quantity),
      formatCurrency(item.unit_price, invoice.currency_code),
      `${item.discount_percent}%`,
      `${item.tax_rate}%`,
      formatCurrency(item.total_price ?? 0, invoice.currency_code),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND_RGB, textColor: 255 },
    theme: 'striped',
  });

  let finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;

  if (invoice.other_costs?.length) {
    autoTable(doc, {
      startY: finalY + 4,
      head: [['Other Cost', 'Category', 'Notes', 'Amount']],
      body: invoice.other_costs.map((cost) => [
        cost.cost_name,
        cost.category ?? '—',
        cost.description ?? '—',
        formatCurrency(cost.amount, invoice.currency_code),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND_RGB, textColor: 255 },
      theme: 'striped',
    });
    finalY =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? finalY + 20;
  }

  const summaryX = doc.internal.pageSize.getWidth() - MARGIN;
  doc.setFontSize(10);
  doc.text(`Subtotal: ${formatCurrency(invoice.subtotal, invoice.currency_code)}`, summaryX, finalY + 8, {
    align: 'right',
  });
  doc.text(`VAT: ${formatCurrency(invoice.tax_amount, invoice.currency_code)}`, summaryX, finalY + 14, {
    align: 'right',
  });
  let lineY = finalY + 20;
  doc.text(
    `Line Items: ${formatCurrency(invoice.total_amount, invoice.currency_code)}`,
    summaryX,
    lineY,
    { align: 'right' },
  );
  if (invoice.other_costs_total) {
    lineY += 6;
    doc.text(
      `Other Costs: ${formatCurrency(invoice.other_costs_total, invoice.currency_code)}`,
      summaryX,
      lineY,
      { align: 'right' },
    );
  }
  const totalY = lineY + 8;
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Grand Total: ${formatCurrency(invoice.grand_total || invoice.total_amount, invoice.currency_code)}`,
    summaryX,
    totalY,
    { align: 'right' },
  );
  doc.setFont('helvetica', 'normal');
  doc.text(`Paid: ${formatCurrency(invoice.paid_amount, invoice.currency_code)}`, summaryX, totalY + 6, {
    align: 'right',
  });
  doc.setFont('helvetica', 'bold');
  doc.text(`Balance: ${formatCurrency(invoice.balance, invoice.currency_code)}`, summaryX, totalY + 12, {
    align: 'right',
  });

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    'This is a computer-generated tax invoice issued in compliance with TRA requirements.',
    MARGIN,
    finalY + 46,
  );

  drawPdfWatermark(doc);
  addFooter(doc);
  doc.save(`${invoice.invoice_number}.pdf`);
}

export function printDocument(elementId: string): void {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #222; }
          h1 { color: #1B3A6B; margin-bottom: 4px; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; font-size: 13px; }
          .meta strong { color: #666; display: block; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
          th { background: #1B3A6B; color: white; padding: 8px; text-align: left; }
          td { border-bottom: 1px solid #eee; padding: 8px; }
          .total { text-align: right; font-weight: bold; margin-top: 12px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>${el.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}
