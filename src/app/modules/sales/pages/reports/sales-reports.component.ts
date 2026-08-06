import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { SalesOrderReportResponse } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { printReportDocument } from '../../../../core/utils/report-print.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';

@Component({
  selector: 'app-sales-reports',
  imports: [
    FormsModule,
    SalesNavComponent,
    PageHeaderComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './sales-reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesReportsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly sales = inject(SalesService);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly data = signal<SalesOrderReportResponse | null>(null);

  dateFrom = this.shiftedDate(-30);
  dateTo = this.today();
  status = '';

  readonly statuses = [
    '',
    'NEW_ORDER',
    'SO_CREATED',
    'STOCK_VERIFICATION',
    'OUT_OF_STOCK',
    'PENDING_DELIVERY_COST',
    'DELIVERY_COST_CALC',
    'QUOTATION_PREP',
    'QUOTATION_SENT',
    'WAITING_CUSTOMER',
    'QUOTATION_ACCEPTED',
    'QUOTATION_REJECTED',
    'INVOICE_GENERATED',
    'AWAITING_PAYMENT',
    'PAYMENT_CONFIRMED',
    'READY_FOR_PICKUP',
    'READY_FOR_DELIVERY',
    'DISPATCHED',
    'IN_TRANSIT',
    'DELIVERED',
    'DELIVERY_CONFIRMED',
    'COMPLETED_PICKUP',
    'COMPLETED_COMPANY',
    'COMPLETED_THIRD_PARTY',
    'CANCELLED',
  ];

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly formatCurrency = formatCurrency;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.sales
      .getSalesOrderReport({
        date_from: this.dateFrom || undefined,
        date_to: this.dateTo || undefined,
        status: this.status || undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (report) => this.data.set(report),
        error: (err) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(err, 'Failed to load sales report'));
        },
      });
  }

  printReport(): void {
    const report = this.data();
    if (!report?.results?.length) {
      this.notification.error('No report data to print.');
      return;
    }

    printReportDocument({
      title: 'Sales Report',
      subtitle: 'Sales Orders Audit View',
      orientation: 'auto',
      filters: [
        { label: 'From', value: this.dateFrom || 'N/A' },
        { label: 'To', value: this.dateTo || 'N/A' },
        { label: 'Status', value: this.status || 'ALL' },
      ],
      footer: {
        preparedBy: this.preparedByName(),
        signedBy: '',
        preparedByLabel: 'Prepared by',
        signedByLabel: 'Signed by',
      },
      generatedAt: formatDateTime(report.generated_at),
      columns: [
        { key: 'reference', label: 'SO' },
        { key: 'customer', label: 'Customer' },
        { key: 'status', label: 'Status' },
        { key: 'delivery_date', label: 'Delivery Date' },
        { key: 'amount', label: 'Amount', align: 'right' },
        { key: 'items', label: 'Items' },
        { key: 'invoices', label: 'Invoices' },
        { key: 'started_by', label: 'Started By' },
        { key: 'closed_by', label: 'Closed By' },
      ],
      rows: report.results.map((row) => ({
        reference: row.reference,
        customer: row.customer,
        status: row.status,
        delivery_date: row.delivery_date ? formatDate(row.delivery_date) : '—',
        amount: formatCurrency(row.total_amount, 'TZS'),
        items: this.itemSummary(row),
        invoices: this.invoiceSummary(row),
        started_by: row.started_by || '—',
        closed_by: row.closed_by || '—',
      })),
    });
  }

  exportCsv(): void {
    const report = this.data();
    if (!report?.results?.length) {
      this.notification.error('No report data to export.');
      return;
    }

    exportToExcel('sales-report-audit', [
      { key: 'reference', label: 'SO' },
      { key: 'customer', label: 'Customer' },
      { key: 'status', label: 'Status' },
      { key: 'delivery_date', label: 'Delivery Date' },
      { key: 'total_amount', label: 'SO Amount' },
      { key: 'started_by', label: 'Started By' },
      { key: 'closed_by', label: 'Closed By' },
      {
        key: 'items',
        label: 'Items',
        format: (row) =>
          (row.items ?? [])
            .map((item) => `${item.item_code} ${item.item_name} qty:${item.qty} u.price:${item.unit_price}`)
            .join(' | '),
      },
      {
        key: 'invoices',
        label: 'Invoices',
        format: (row) =>
          (row.invoices ?? [])
            .map((inv) => `${inv.invoice_number} ${inv.status} total:${inv.total_amount} paid:${inv.paid_amount}`)
            .join(' | '),
      },
    ], report.results);
  }

  exportAuditorCsv(): void {
    const report = this.data();
    if (!report?.results?.length) {
      this.notification.error('No report data to export.');
      return;
    }

    const rows = this.buildAuditorRows(report);
    exportToExcel('sales-report-auditor-line-level', [
      { key: 'reference', label: 'SO' },
      { key: 'customer', label: 'Customer' },
      { key: 'status', label: 'SO Status' },
      { key: 'delivery_date', label: 'Delivery Date' },
      { key: 'so_amount', label: 'SO Amount' },
      { key: 'started_by', label: 'Started By' },
      { key: 'closed_by', label: 'Closed By' },
      { key: 'item_code', label: 'Item Code' },
      { key: 'item_name', label: 'Item Name' },
      { key: 'item_uom', label: 'Item UOM' },
      { key: 'item_qty', label: 'Item Qty' },
      { key: 'item_unit_price', label: 'Item Unit Price' },
      { key: 'item_line_total', label: 'Item Line Total' },
      { key: 'invoice_number', label: 'Invoice Number' },
      { key: 'invoice_date', label: 'Invoice Date' },
      { key: 'invoice_due_date', label: 'Invoice Due Date' },
      { key: 'invoice_total', label: 'Invoice Total' },
      { key: 'invoice_paid', label: 'Invoice Paid' },
      { key: 'invoice_status', label: 'Invoice Status' },
    ], rows);
  }

  itemSummary(row: SalesOrderReportResponse['results'][number]): string {
    if (!row.items?.length) {
      return '—';
    }
    return row.items.map((i) => `${i.item_code}(${i.qty})`).join(', ');
  }

  invoiceSummary(row: SalesOrderReportResponse['results'][number]): string {
    if (!row.invoices?.length) {
      return '—';
    }
    return row.invoices.map((i) => `${i.invoice_number}:${i.status}`).join(', ');
  }

  private buildAuditorRows(report: SalesOrderReportResponse): Array<Record<string, string>> {
    const rows: Array<Record<string, string>> = [];

    for (const base of report.results) {
      const items = base.items?.length ? base.items : [null];
      const invoices = base.invoices?.length ? base.invoices : [null];

      for (const item of items) {
        for (const invoice of invoices) {
          rows.push({
            reference: base.reference,
            customer: base.customer,
            status: base.status,
            delivery_date: base.delivery_date ?? '',
            so_amount: base.total_amount,
            started_by: base.started_by ?? '',
            closed_by: base.closed_by ?? '',
            item_code: item?.item_code ?? '',
            item_name: item?.item_name ?? '',
            item_uom: item?.uom ?? '',
            item_qty: item?.qty ?? '',
            item_unit_price: item?.unit_price ?? '',
            item_line_total: item?.line_total ?? '',
            invoice_number: invoice?.invoice_number ?? '',
            invoice_date: invoice?.invoice_date ?? '',
            invoice_due_date: invoice?.due_date ?? '',
            invoice_total: invoice?.total_amount ?? '',
            invoice_paid: invoice?.paid_amount ?? '',
            invoice_status: invoice?.status ?? '',
          });
        }
      }
    }

    return rows;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private shiftedDate(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  private preparedByName(): string {
    const user = this.auth.getCurrentUser();
    if (!user) return '____________________________';
    return user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
  }
}
