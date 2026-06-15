import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Payslip } from '../models/hr.model';
import {
  COMPANY_DETAILS,
  formatHrAmount,
  maskBankAccount,
} from '../../modules/hr/constants/hr.constants';
import { formatDate } from './format.util';

const BRAND_RGB: [number, number, number] = [27, 58, 107];
const MARGIN = 14;

function addHeader(doc: jsPDF, title: string, subtitle: string): number {
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_DETAILS.name, MARGIN, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`TIN: ${COMPANY_DETAILS.tin} | VRN: ${COMPANY_DETAILS.vat}`, MARGIN, 18);
  doc.text(COMPANY_DETAILS.address, MARGIN, 23);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, doc.internal.pageSize.getWidth() - MARGIN, 12, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, doc.internal.pageSize.getWidth() - MARGIN, 19, { align: 'right' });
  doc.setTextColor(40, 40, 40);
  return 44;
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

function finalTableY(doc: jsPDF, fallback: number): number {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;
}

export function exportPayslipPdf(payslip: Payslip): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = addHeader(doc, 'PAYSLIP', `Period: ${payslip.period_display}`);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const leftCol = MARGIN;
  const rightCol = pageWidth / 2 + 4;
  const rowHeight = 5;

  const leftDetails: [string, string][] = [
    ['Employee', payslip.employee_name],
    ['Department', payslip.department_name],
    ['Job Title', payslip.job_title],
    ['Bank', payslip.bank_name || '—'],
  ];
  const rightDetails: [string, string][] = [
    ['Emp No', payslip.employee_number],
    ['TIN', payslip.tin_number || '—'],
    ['NSSF No', payslip.nssf_number || '—'],
    ['A/C', maskBankAccount(payslip.bank_account)],
  ];

  for (let i = 0; i < leftDetails.length; i++) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${leftDetails[i][0]}:`, leftCol, y);
    doc.setFont('helvetica', 'normal');
    doc.text(leftDetails[i][1], leftCol + 28, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${rightDetails[i][0]}:`, rightCol, y);
    doc.setFont('helvetica', 'normal');
    doc.text(rightDetails[i][1], rightCol + 22, y);
    y += rowHeight;
  }

  y += 4;

  const allowanceRows: [string, string][] = (payslip.allowances ?? []).map((a) => [
    a.name,
    formatHrAmount(a.amount),
  ]);

  const earningsRows: [string, string][] = [
    ['Basic Salary', formatHrAmount(payslip.basic_salary)],
    ...allowanceRows,
    ['GROSS', formatHrAmount(payslip.gross_salary)],
  ];

  const deductionRows: [string, string][] = [
    ['NSSF (Employee)', formatHrAmount(payslip.nssf_employee)],
    ['PAYE', formatHrAmount(payslip.paye)],
    ['NHIF', formatHrAmount(payslip.nhif)],
    ...(Number(payslip.other_deductions) > 0
      ? [['Other Deductions', formatHrAmount(payslip.other_deductions)] as [string, string]]
      : []),
    ['TOTAL DEDUCTIONS', formatHrAmount(payslip.total_deductions)],
  ];

  const colWidth = (pageWidth - MARGIN * 2 - 4) / 2;

  autoTable(doc, {
    startY: y,
    head: [['EARNINGS', 'Amount (TZS)']],
    body: earningsRows,
    margin: { left: MARGIN, right: pageWidth / 2 + 2 },
    tableWidth: colWidth,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND_RGB, textColor: 255 },
    theme: 'striped',
  });

  const earningsEndY = finalTableY(doc, y);

  autoTable(doc, {
    startY: y,
    head: [['DEDUCTIONS', 'Amount (TZS)']],
    body: deductionRows,
    margin: { left: pageWidth / 2 + 2, right: MARGIN },
    tableWidth: colWidth,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND_RGB, textColor: 255 },
    theme: 'striped',
  });

  y = Math.max(earningsEndY, finalTableY(doc, y)) + 8;

  doc.setFillColor(240, 245, 250);
  doc.rect(MARGIN, y - 4, pageWidth - MARGIN * 2, 12, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_RGB);
  doc.text(`NET PAY: ${formatHrAmount(payslip.net_salary)}`, pageWidth / 2, y + 3, {
    align: 'center',
  });

  y += 14;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Employer NSSF Contribution: ${formatHrAmount(payslip.nssf_employer)}`,
    MARGIN,
    y,
  );

  addFooter(doc);

  const periodSlug = payslip.period_display.replace(/\s+/g, '-').toLowerCase();
  doc.save(`payslip-${payslip.employee_number}-${periodSlug}.pdf`);
}
