import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { DeliveryNote, DeliveryOrder } from '../models/logistics.model';
import { formatDate, formatDateTime } from './format.util';
import { COMPANY_DETAILS } from '../../modules/logistics/constants/logistics.constants';

const MARGIN = 14;

function addHeader(doc: jsPDF, title: string, docNumber: string): number {
  doc.setFillColor(27, 58, 107);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_DETAILS.name, MARGIN, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_DETAILS.address, MARGIN, 19);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, doc.internal.pageSize.getWidth() - MARGIN, 12, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(docNumber, doc.internal.pageSize.getWidth() - MARGIN, 19, { align: 'right' });
  doc.setTextColor(40, 40, 40);
  return 36;
}

export function exportDeliveryNotePdf(note: DeliveryNote, order?: DeliveryOrder): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'DELIVERY NOTE', note.dn_number);

  doc.setFontSize(10);
  doc.text(`Delivered To: ${note.customer_name}`, MARGIN, y);
  doc.text(`Date: ${note.delivery_date ? formatDate(note.delivery_date) : '—'}`, MARGIN + 100, y);
  y += 12;

  if (order) {
    autoTable(doc, {
      startY: y,
      head: [['Item', 'Qty', 'Serial No.', 'Condition']],
      body: order.items.map((i) => [
        `${i.item_code} — ${i.item_name}`,
        String(i.quantity),
        i.serial_number || '—',
        i.condition_out || 'Good',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [27, 58, 107] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  doc.text(`Driver: ${order?.driver_name ?? '________________'}`, MARGIN, y);
  y += 6;
  doc.text(`Vehicle: ${order?.vehicle_registration ?? '________________'}`, MARGIN, y);
  y += 12;
  doc.text(`Received by: ${note.signed_by || '________________________'}`, MARGIN, y);
  y += 6;
  doc.text(`Signed at: ${note.signed_at ? formatDateTime(note.signed_at) : '________________'}`, MARGIN, y);

  doc.save(`${note.dn_number}.pdf`);
}

export function printDocument(elementId: string): void {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<html><head><title>Print</title>
    <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#1B3A6B;color:#fff}</style>
    </head><body>${el.innerHTML}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}
