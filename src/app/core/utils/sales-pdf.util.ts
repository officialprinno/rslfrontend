import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Invoice, Quotation } from '../models/sales.model';
import { COMPANY_DETAILS } from '../../modules/sales/constants/sales.constants';
import { formatCurrency, formatDate } from './format.util';

const BRAND_RGB: [number, number, number] = [27, 58, 107];
const MARGIN = 14;

function addHeader(doc: jsPDF, title: string, docNumber: string): number {
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_DETAILS.name, MARGIN, 11);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`TIN: ${COMPANY_DETAILS.tin} | VRN: ${COMPANY_DETAILS.vat}`, MARGIN, 17);
  doc.text(COMPANY_DETAILS.address, MARGIN, 22);
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

  y = addMetaGrid(doc, y, [
    ['Customer', quotation.customer_name],
    ['Mine', quotation.mine_name],
    ['Valid Until', formatDate(quotation.valid_until)],
    ['Status', quotation.status],
    ['Currency', quotation.currency_code],
    ['Exchange Rate', String(quotation.exchange_rate)],
    ['Prepared By', quotation.created_by_name],
    ['Date', formatDate(quotation.created_at)],
  ]);

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
  let totalY = finalY + 22;
  if (quotation.delivery_cost) {
    doc.text(
      `Delivery: ${formatCurrency(quotation.delivery_cost, quotation.currency_code)}`,
      summaryX,
      finalY + 20,
      { align: 'right' },
    );
    totalY = finalY + 28;
  }
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

  addFooter(doc);
  doc.save(`${quotation.quotation_number}.pdf`);
}

export function exportInvoicePdf(invoice: Invoice): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'TAX INVOICE', invoice.invoice_number);

  y = addMetaGrid(doc, y, [
    ['Customer', invoice.customer_name],
    ['Customer TIN', invoice.customer_tin],
    ['Sales Order', invoice.so_number ?? '—'],
    ['Invoice Date', formatDate(invoice.invoice_date)],
    ['Due Date', formatDate(invoice.due_date)],
    ['TRA Receipt No.', invoice.tra_receipt_number || '—'],
    ['Currency', invoice.currency_code],
    ['Status', invoice.status],
  ]);

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

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
  const summaryX = doc.internal.pageSize.getWidth() - MARGIN;
  doc.setFontSize(10);
  doc.text(`Subtotal: ${formatCurrency(invoice.subtotal, invoice.currency_code)}`, summaryX, finalY + 8, {
    align: 'right',
  });
  doc.text(`VAT: ${formatCurrency(invoice.tax_amount, invoice.currency_code)}`, summaryX, finalY + 14, {
    align: 'right',
  });
  let totalY = finalY + 22;
  if (invoice.delivery_cost) {
    doc.text(
      `Delivery: ${formatCurrency(invoice.delivery_cost, invoice.currency_code)}`,
      summaryX,
      finalY + 20,
      { align: 'right' },
    );
    totalY = finalY + 28;
  }
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Total: ${formatCurrency(invoice.total_amount, invoice.currency_code)}`,
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
