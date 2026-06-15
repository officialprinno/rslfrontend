import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { GoodsReceivedNote, PurchaseOrder } from '../models/procurement.model';
import { formatCurrency, formatDate } from './format.util';

const BRAND_RGB: [number, number, number] = [27, 58, 107];
const MARGIN = 14;

function addHeader(doc: jsPDF, title: string, docNumber: string): number {
  doc.setFillColor(27, 58, 107);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Rock Solutions Limited', MARGIN, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Factory Management System', MARGIN, 19);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, doc.internal.pageSize.getWidth() - MARGIN, 12, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(docNumber, doc.internal.pageSize.getWidth() - MARGIN, 19, { align: 'right' });
  doc.setTextColor(40, 40, 40);
  return 36;
}

function addMetaGrid(doc: jsPDF, startY: number, rows: [string, string][]): number {
  doc.setFontSize(9);
  let y = startY;
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

export function exportPurchaseOrderPdf(po: PurchaseOrder): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'PURCHASE ORDER', po.po_number);

  y = addMetaGrid(doc, y, [
    ['Supplier', po.supplier_name],
    ['Status', po.status],
    ['Order Date', formatDate(po.order_date)],
    ['Expected Delivery', formatDate(po.expected_delivery)],
    ['Payment Terms', po.payment_terms],
    ['Currency', po.currency_code],
    ['Created By', po.created_by_name],
    ['Approved By', po.approved_by_name ?? '—'],
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Qty', 'Unit Price', 'Disc %', 'Total']],
    body: po.items.map((item) => [
      `${item.item_code} — ${item.item_name}`,
      String(item.quantity_ordered),
      formatCurrency(item.unit_price, po.currency_code),
      `${item.discount_percent}%`,
      formatCurrency(item.total_price, po.currency_code),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND_RGB, textColor: 255 },
    theme: 'striped',
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
  const summaryX = doc.internal.pageSize.getWidth() - MARGIN;
  doc.setFontSize(10);
  doc.text(`Subtotal: ${formatCurrency(po.subtotal, po.currency_code)}`, summaryX, finalY + 8, {
    align: 'right',
  });
  doc.text(`VAT: ${formatCurrency(po.tax_amount, po.currency_code)}`, summaryX, finalY + 14, {
    align: 'right',
  });
  doc.setFont('helvetica', 'bold');
  doc.text(`Grand Total: ${formatCurrency(po.total_amount, po.currency_code)}`, summaryX, finalY + 22, {
    align: 'right',
  });

  if (po.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Notes / Terms', MARGIN, finalY + 32);
    doc.setTextColor(80, 80, 80);
    const split = doc.splitTextToSize(po.notes, doc.internal.pageSize.getWidth() - MARGIN * 2);
    doc.text(split, MARGIN, finalY + 38);
  }

  addFooter(doc);
  doc.save(`${po.po_number}.pdf`);
}

export function exportGrnPdf(grn: GoodsReceivedNote): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'GOODS RECEIVED NOTE', grn.grn_number);

  y = addMetaGrid(doc, y, [
    ['PO Number', grn.po_number],
    ['Supplier', grn.supplier_name],
    ['Warehouse', grn.warehouse_name],
    ['Received Date', formatDate(grn.received_date)],
    ['Received By', grn.received_by_name],
    ['Status', grn.status],
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Qty Received', 'Unit Cost', 'Condition', 'Notes']],
    body: grn.items.map((item) => [
      item.item_name ?? String(item.item),
      String(item.quantity_received),
      formatCurrency(item.unit_cost),
      item.condition,
      item.notes || '—',
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND_RGB, textColor: 255 },
    theme: 'striped',
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
  if (grn.notes) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('Notes', MARGIN, finalY + 10);
    const split = doc.splitTextToSize(grn.notes, doc.internal.pageSize.getWidth() - MARGIN * 2);
    doc.text(split, MARGIN, finalY + 16);
  }

  addFooter(doc);
  doc.save(`${grn.grn_number}.pdf`);
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
