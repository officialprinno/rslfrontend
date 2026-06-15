import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { WorkOrder } from '../models/production.model';
import { formatDate, formatDateTime } from './format.util';

const MARGIN = 14;

export function exportWorkOrderPdf(wo: WorkOrder): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(27, 58, 107);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Rock Solutions Limited', MARGIN, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PRODUCTION JOB CARD', MARGIN, 19);
  doc.setFontSize(14);
  doc.text(wo.wo_number, doc.internal.pageSize.getWidth() - MARGIN, 12, { align: 'right' });
  doc.setTextColor(40, 40, 40);

  let y = 36;
  const rows: [string, string][] = [
    ['Product', wo.product_name],
    ['BOM Version', wo.bom_version],
    ['Qty Planned', String(wo.quantity_planned)],
    ['Shift', wo.shift],
    ['Operator', wo.operator_name],
    ['Planned Start', formatDateTime(wo.planned_start)],
    ['Planned End', formatDateTime(wo.planned_end)],
    ['Status', wo.status],
  ];
  if (wo.so_number) rows.push(['Sales Order', wo.so_number]);

  doc.setFontSize(9);
  rows.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * 95;
    const lineY = y + row * 12;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 120, 120);
    doc.text(label, x, lineY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(value || '—', x, lineY + 5);
  });
  y += Math.ceil(rows.length / 2) * 12 + 8;

  if (wo.material_requirements?.length) {
    autoTable(doc, {
      startY: y,
      head: [['Material', 'Required', 'Available', 'OK']],
      body: wo.material_requirements.map((m) => [
        m.item_name,
        m.required_quantity,
        m.available_stock,
        m.is_sufficient ? 'Yes' : 'NO',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [27, 58, 107] },
    });
  }

  if (wo.notes) {
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    doc.text(`Notes: ${wo.notes}`, MARGIN, finalY + 10);
  }

  doc.save(`${wo.wo_number}-job-card.pdf`);
}

export function printDocument(elementId: string): void {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<html><head><title>Print</title></head><body>${el.innerHTML}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}
