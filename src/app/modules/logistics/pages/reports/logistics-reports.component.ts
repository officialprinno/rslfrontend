import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { LogisticsDeliveryReportResponse } from '../../../../core/models/logistics.model';
import { AuthService } from '../../../../core/services/auth.service';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatDateTime } from '../../../../core/utils/format.util';
import { printReportDocument } from '../../../../core/utils/report-print.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';

@Component({
  selector: 'app-logistics-reports',
  imports: [
    FormsModule,
    LogisticsNavComponent,
    PageHeaderComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './logistics-reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogisticsReportsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly logistics = inject(LogisticsService);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly data = signal<LogisticsDeliveryReportResponse | null>(null);

  dateFrom = this.shiftedDate(-30);
  dateTo = this.today();
  status = '';

  readonly statuses = ['', 'SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED'];

  readonly formatDateTime = formatDateTime;
  readonly formatCurrency = formatCurrency;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.logistics
      .getDeliveryReport({
        date_from: this.dateFrom || undefined,
        date_to: this.dateTo || undefined,
        status: this.status || undefined,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (report) => this.data.set(report),
        error: (err) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(err, 'Failed to load logistics report'));
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
      title: 'Logistics Report',
      subtitle: 'Delivery Orders Audit View',
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
        { key: 'reference', label: 'DO' },
        { key: 'sales_order', label: 'Sales Order' },
        { key: 'customer', label: 'Customer' },
        { key: 'status', label: 'Status' },
        { key: 'scheduled_date', label: 'Scheduled' },
        { key: 'internal_cost', label: 'Internal Cost', align: 'right' },
        { key: 'items', label: 'Items' },
        { key: 'invoices', label: 'Invoices' },
        { key: 'started_by', label: 'Started By' },
        { key: 'closed_by', label: 'Closed By' },
      ],
      rows: report.results.map((row) => ({
        reference: row.reference,
        sales_order: row.sales_order,
        customer: row.customer,
        status: row.status,
        scheduled_date: row.scheduled_date ? formatDateTime(row.scheduled_date) : '—',
        internal_cost: formatCurrency(row.internal_delivery_cost, 'TZS'),
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

    exportToExcel('logistics-report-audit', [
      { key: 'reference', label: 'DO' },
      { key: 'sales_order', label: 'Sales Order' },
      { key: 'customer', label: 'Customer' },
      { key: 'status', label: 'Status' },
      { key: 'scheduled_date', label: 'Scheduled Date' },
      { key: 'internal_delivery_cost', label: 'Internal Cost' },
      { key: 'started_by', label: 'Started By' },
      { key: 'closed_by', label: 'Closed By' },
      {
        key: 'items',
        label: 'Items',
        format: (row) =>
          (row.items ?? [])
            .map((item) => `${item.item_code} ${item.item_name} qty:${item.qty}`)
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
    exportToExcel('logistics-report-auditor-line-level', [
      { key: 'reference', label: 'DO' },
      { key: 'sales_order', label: 'Sales Order' },
      { key: 'customer', label: 'Customer' },
      { key: 'status', label: 'Delivery Status' },
      { key: 'scheduled_date', label: 'Scheduled Date' },
      { key: 'internal_cost', label: 'Internal Delivery Cost' },
      { key: 'started_by', label: 'Started By' },
      { key: 'closed_by', label: 'Closed By' },
      { key: 'item_code', label: 'Item Code' },
      { key: 'item_name', label: 'Item Name' },
      { key: 'item_uom', label: 'Item UOM' },
      { key: 'item_qty', label: 'Item Qty' },
      { key: 'item_condition_out', label: 'Item Condition Out' },
      { key: 'invoice_number', label: 'Invoice Number' },
      { key: 'invoice_date', label: 'Invoice Date' },
      { key: 'invoice_due_date', label: 'Invoice Due Date' },
      { key: 'invoice_total', label: 'Invoice Total' },
      { key: 'invoice_paid', label: 'Invoice Paid' },
      { key: 'invoice_status', label: 'Invoice Status' },
    ], rows);
  }

  itemSummary(row: LogisticsDeliveryReportResponse['results'][number]): string {
    if (!row.items?.length) {
      return '—';
    }
    return row.items.map((i) => `${i.item_code}(${i.qty})`).join(', ');
  }

  invoiceSummary(row: LogisticsDeliveryReportResponse['results'][number]): string {
    if (!row.invoices?.length) {
      return '—';
    }
    return row.invoices.map((i) => `${i.invoice_number}:${i.status}`).join(', ');
  }

  private buildAuditorRows(report: LogisticsDeliveryReportResponse): Array<Record<string, string>> {
    const rows: Array<Record<string, string>> = [];

    for (const base of report.results) {
      const items = base.items?.length ? base.items : [null];
      const invoices = base.invoices?.length ? base.invoices : [null];

      for (const item of items) {
        for (const invoice of invoices) {
          rows.push({
            reference: base.reference,
            sales_order: base.sales_order,
            customer: base.customer,
            status: base.status,
            scheduled_date: base.scheduled_date ?? '',
            internal_cost: base.internal_delivery_cost,
            started_by: base.started_by ?? '',
            closed_by: base.closed_by ?? '',
            item_code: item?.item_code ?? '',
            item_name: item?.item_name ?? '',
            item_uom: item?.uom ?? '',
            item_qty: item?.qty ?? '',
            item_condition_out: item?.condition_out ?? '',
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
