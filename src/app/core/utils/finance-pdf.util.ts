import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  BalanceSheet,
  CashFlowStatement,
  IncomeStatement,
  LedgerEntry,
  NSSFSummary,
  PAYESummary,
  VATSummary,
} from '../models/finance.model';
import { COMPANY_DETAILS, formatAccountingAmount } from '../../modules/finance/constants/finance.constants';
import { formatDate } from './format.util';

const BRAND_RGB: [number, number, number] = [27, 58, 107];
const MARGIN = 14;

function addHeader(doc: jsPDF, title: string, subtitle: string): number {
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
  doc.text(subtitle, doc.internal.pageSize.getWidth() - MARGIN, 19, { align: 'right' });
  doc.setTextColor(40, 40, 40);
  return 40;
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

function monthLabel(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function finalTableY(doc: jsPDF, fallback: number): number {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;
}

function addSummaryLine(doc: jsPDF, y: number, label: string, amount: string, bold = false): number {
  const x = doc.internal.pageSize.getWidth() - MARGIN;
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(10);
  doc.text(`${label}: ${formatAccountingAmount(amount)}`, x, y, { align: 'right' });
  return y + 6;
}

export function exportIncomeStatementPdf(report: IncomeStatement): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const period = `${formatDate(report.period_from)} — ${formatDate(report.period_to)}`;
  let y = addHeader(doc, 'INCOME STATEMENT', period);

  const revenueRows: [string, string][] = [
    ['Trading Revenue', report.trading_revenue],
    ['Manufacturing Revenue', report.manufacturing_revenue],
    ['Total Revenue', report.total_revenue],
    ['Opening Inventory', report.opening_inventory],
    ['Purchases', report.purchases],
    ['Closing Inventory', report.closing_inventory],
    ['Total COGS', report.total_cogs],
    ['Gross Profit', report.gross_profit],
    ['Gross Margin', `${report.gross_margin_percent}%`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Amount (TZS)']],
    body: revenueRows.map(([label, amount]) => [label, formatAccountingAmount(amount)]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: BRAND_RGB, textColor: 255 },
    theme: 'striped',
  });

  y = finalTableY(doc, y + 20) + 4;

  if (report.expenses.length) {
    autoTable(doc, {
      startY: y,
      head: [['Expense Account', 'Amount (TZS)']],
      body: report.expenses.map((e) => [`${e.code} — ${e.name}`, formatAccountingAmount(e.amount)]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: BRAND_RGB, textColor: 255 },
      theme: 'striped',
    });
    y = finalTableY(doc, y + 20) + 4;
  }

  y = addSummaryLine(doc, y, 'Total Expenses', report.total_expenses);
  y = addSummaryLine(doc, y, 'Net Profit', report.net_profit, true);
  addSummaryLine(doc, y, 'Net Margin', `${report.net_margin_percent}%`);

  addFooter(doc);
  doc.save(`income-statement-${report.period_from}-${report.period_to}.pdf`);
}

export function exportBalanceSheetPdf(report: BalanceSheet): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'BALANCE SHEET', `As of ${formatDate(report.as_of_date)}`);

  const sections: { title: string; lines: { code: string; name: string; amount: string }[]; total: string }[] = [
    { title: 'Current Assets', lines: report.current_assets, total: report.total_current_assets },
    { title: 'Fixed Assets', lines: report.fixed_assets, total: report.total_fixed_assets },
    { title: 'Current Liabilities', lines: report.current_liabilities, total: report.total_liabilities },
    { title: 'Equity', lines: report.equity, total: report.total_equity },
  ];

  for (const section of sections) {
    if (!section.lines.length) continue;
    autoTable(doc, {
      startY: y,
      head: [[section.title, 'Amount (TZS)']],
      body: [
        ...section.lines.map((line) => [`${line.code} — ${line.name}`, formatAccountingAmount(line.amount)]),
        [`Total ${section.title}`, formatAccountingAmount(section.total)],
      ],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: BRAND_RGB, textColor: 255 },
      theme: 'striped',
    });
    y = finalTableY(doc, y + 20) + 6;
  }

  y = addSummaryLine(doc, y, 'Total Assets', report.total_assets, true);
  y = addSummaryLine(doc, y, 'Total Liabilities & Equity', report.total_liabilities_equity, true);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    report.is_balanced ? 'Balanced' : 'Out of balance — review required',
    MARGIN,
    y + 4,
  );

  addFooter(doc);
  doc.save(`balance-sheet-${report.as_of_date}.pdf`);
}

export function exportCashFlowPdf(report: CashFlowStatement): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const period = `${formatDate(report.period_from)} — ${formatDate(report.period_to)}`;
  let y = addHeader(doc, 'CASH FLOW STATEMENT', period);

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Amount (TZS)']],
    body: [
      ['Operating Inflows', formatAccountingAmount(report.operating_inflows)],
      ['Operating Outflows', formatAccountingAmount(report.operating_outflows)],
      ['Net Cash Flow', formatAccountingAmount(report.net_cash_flow)],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: BRAND_RGB, textColor: 255 },
    theme: 'striped',
  });

  addFooter(doc);
  doc.save(`cash-flow-${report.period_from}-${report.period_to}.pdf`);
}

export function exportGeneralLedgerPdf(
  entries: LedgerEntry[],
  accountLabel: string,
  dateFrom: string,
  dateTo: string,
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const period = `${formatDate(dateFrom)} — ${formatDate(dateTo)}`;
  const y = addHeader(doc, 'GENERAL LEDGER', period);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Account: ${accountLabel}`, MARGIN, y);

  autoTable(doc, {
    startY: y + 6,
    head: [['Date', 'JE #', 'Description', 'Debit', 'Credit', 'Balance']],
    body: entries.map((e) => [
      formatDate(e.date),
      e.je_number,
      e.description,
      formatAccountingAmount(e.debit),
      formatAccountingAmount(e.credit),
      formatAccountingAmount(e.balance),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: BRAND_RGB, textColor: 255 },
    theme: 'striped',
  });

  addFooter(doc);
  doc.save(`general-ledger-${dateFrom}-${dateTo}.pdf`);
}

export function exportVATSummaryPdf(summary: VATSummary): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'VAT RETURN SUMMARY', monthLabel(summary.month, summary.year));

  y = addSummaryLine(doc, y + 4, 'Output VAT', summary.output_vat);
  y = addSummaryLine(doc, y, 'Input VAT', summary.input_vat);
  y = addSummaryLine(doc, y, 'Net VAT Payable', summary.net_vat_payable, true);

  if (summary.transactions.length) {
    autoTable(doc, {
      startY: y + 6,
      head: [['Date', 'Type', 'Reference', 'Net', 'VAT', 'Rate']],
      body: summary.transactions.map((t) => [
        formatDate(t.date),
        t.type,
        t.reference,
        formatAccountingAmount(t.net_amount),
        formatAccountingAmount(t.vat_amount),
        `${t.rate}%`,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND_RGB, textColor: 255 },
      theme: 'striped',
    });
  }

  addFooter(doc);
  doc.save(`vat-summary-${summary.year}-${String(summary.month).padStart(2, '0')}.pdf`);
}

export function exportPAYESummaryPdf(summary: PAYESummary): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'PAYE SUMMARY', monthLabel(summary.month, summary.year));

  y = addSummaryLine(doc, y + 4, 'Total PAYE', summary.total_paye, true);

  if (summary.entries.length) {
    autoTable(doc, {
      startY: y + 6,
      head: [['Employee', 'Gross', 'Taxable', 'PAYE', 'YTD']],
      body: summary.entries.map((e) => [
        e.employee,
        formatAccountingAmount(e.gross),
        formatAccountingAmount(e.taxable_income),
        formatAccountingAmount(e.paye_amount),
        formatAccountingAmount(e.cumulative_ytd),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND_RGB, textColor: 255 },
      theme: 'striped',
    });
  }

  addFooter(doc);
  doc.save(`paye-summary-${summary.year}-${String(summary.month).padStart(2, '0')}.pdf`);
}

export function exportNSSFSummaryPdf(summary: NSSFSummary): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = addHeader(doc, 'NSSF SUMMARY', monthLabel(summary.month, summary.year));

  y = addSummaryLine(doc, y + 4, 'Employee Contribution', summary.total_employee);
  y = addSummaryLine(doc, y, 'Employer Contribution', summary.total_employer);
  addSummaryLine(doc, y, 'Total NSSF', summary.total_nssf, true);

  addFooter(doc);
  doc.save(`nssf-summary-${summary.year}-${String(summary.month).padStart(2, '0')}.pdf`);
}
