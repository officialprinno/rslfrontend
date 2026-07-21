import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Invoice, SalesOrder, SOItem, SOPaymentProof } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { downloadBlob } from '../../../../core/utils/download.util';
import { handleScopedRecordLoadError } from '../../../../core/utils/workspace-empty-state.util';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { CompanyWorkspaceEmptyStateComponent } from '../../../../shared/components/company-workspace-empty-state/company-workspace-empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { WorkflowStepperComponent } from '../../../procurement/components/workflow-stepper/workflow-stepper.component';
import { SoWorkflowPanelComponent } from '../../../sales/components/so-workflow-panel/so-workflow-panel.component';
import { DELIVERY_METHODS } from '../../../sales/constants/sales.constants';
import { orderWorkflowIndex, orderWorkflowSteps, isPartialPaymentTerm, orderPaidPercent } from '../../../sales/utils/order-workflow.util';
import {
  hasStartedInvoicing as lineHasStartedInvoicing,
  stockOutstandingDisplay,
  StockOutstandingDisplay,
  toInvoiceQty as lineToInvoiceQty,
} from '../../../sales/utils/order-qty-display.util';
import { canGenerateSalesInvoice } from '../../../sales/utils/sales-permissions.util';

@Component({
  selector: 'app-finance-sales-order-detail',
  imports: [
    DecimalPipe,
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    WorkflowStepperComponent,
    SoWorkflowPanelComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
    CompanyWorkspaceEmptyStateComponent,
  ],
  templateUrl: './finance-sales-order-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceSalesOrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sales = inject(SalesService);
  private readonly notification = inject(NotificationService);
  private readonly auth = inject(AuthService);

  readonly order = signal<SalesOrder | null>(null);
  readonly invoices = signal<Invoice[]>([]);
  readonly loading = signal(true);
  readonly loadingInvoices = signal(false);
  readonly exportingPdf = signal(false);
  readonly error = signal(false);
  readonly notInWorkspace = signal(false);

  orderStepsFor(o: SalesOrder): string[] {
    return orderWorkflowSteps(o.payment_term);
  }

  workflowIndex(o: SalesOrder): number {
    return orderWorkflowIndex(o.status, o.payment_term, o);
  }
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly canGenerateInvoice = () => canGenerateSalesInvoice(this.auth);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.notInWorkspace.set(false);
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.sales
      .getSalesOrder(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (o) => {
          this.order.set(o);
          this.loadInvoices(o.id);
        },
        error: (e) => {
          handleScopedRecordLoadError(e, this.error, this.notInWorkspace);
          if (this.error()) {
            this.notification.error(getApiErrorMessage(e));
          }
        },
      });
  }

  loadInvoices(orderId: number): void {
    this.loadingInvoices.set(true);
    this.sales
      .getInvoices({ sales_order: orderId, page_size: 20 })
      .pipe(finalize(() => this.loadingInvoices.set(false)))
      .subscribe({
        next: (d) => this.invoices.set(d.results),
        error: () => this.invoices.set([]),
      });
  }

  exportPdf(): void {
    const o = this.order();
    if (!o) return;
    this.exportingPdf.set(true);
    this.sales
      .downloadSalesOrderPdf(o.id)
      .pipe(finalize(() => this.exportingPdf.set(false)))
      .subscribe({
        next: (blob) => downloadBlob(blob, `${o.so_number}.pdf`),
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to generate PDF')),
      });
  }

  deliveryTypeLabel(method?: string | null): string {
    if (!method) return 'Company Delivery';
    return DELIVERY_METHODS.find((m) => m.value === method)?.label ?? method;
  }

  deliveryDestination(o: SalesOrder): string {
    return o.requested_delivery_location || o.delivery_address || '—';
  }

  isPartialPayment(o: SalesOrder): boolean {
    return isPartialPaymentTerm(o.payment_term);
  }

  advancePaidLabel(o: SalesOrder): string {
    const paidPct = orderPaidPercent(o);
    if (o.payment_status === 'PAID' || paidPct >= 100) {
      return '100% (Fully Paid)';
    }
    if (paidPct > 0) {
      return `${paidPct.toFixed(2)}% paid`;
    }
    const deposit = Number(o.deposit_percent ?? 0);
    return deposit > 0 ? `${deposit}% deposit due` : '—';
  }

  verifiedPaymentProofs(o: SalesOrder): SOPaymentProof[] {
    return (o.payment_proofs ?? [])
      .filter((p) => p.status === 'VERIFIED')
      .sort((a, b) => {
        const ta = a.verified_at ? new Date(a.verified_at).getTime() : 0;
        const tb = b.verified_at ? new Date(b.verified_at).getTime() : 0;
        return ta - tb;
      });
  }

  latestVerifiedProof(o: SalesOrder): SOPaymentProof | undefined {
    const proofs = this.verifiedPaymentProofs(o);
    return proofs.length ? proofs[proofs.length - 1] : undefined;
  }

  partialPaymentProgress(o: SalesOrder): {
    orderTotal: number;
    totalPaid: number;
    paidPercent: number;
    remainingAmount: number;
    remainingPercent: number;
  } {
    const summary = o.order_invoicing_summary;
    const orderTotal = summary
      ? Number(summary.order_grand_total)
      : Number(o.total_amount) || 0;
    const proofTotal = this.verifiedPaymentProofs(o).reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );
    let totalPaid = proofTotal;
    if (!totalPaid && summary) {
      totalPaid = Number(summary.total_paid_amount);
    }
    totalPaid = Math.min(totalPaid, orderTotal);
    const remainingAmount = Math.max(orderTotal - totalPaid, 0);
    const paidPercent = orderTotal
      ? Math.round((totalPaid / orderTotal) * 10000) / 100
      : 0;
    const remainingPercent = Math.max(
      Math.round((100 - paidPercent) * 100) / 100,
      0,
    );
    return {
      orderTotal,
      totalPaid,
      paidPercent,
      remainingAmount,
      remainingPercent,
    };
  }

  paymentPercentOfOrder(amount: number, orderTotal: number): number {
    if (!orderTotal) return 0;
    return Math.round((amount / orderTotal) * 10000) / 100;
  }

  invoicePercentOfOrder(
    inv: { bill_amount?: string | number; bill_percent?: string | number },
    o: SalesOrder,
  ): number {
    const bill = Number(inv.bill_amount ?? 0);
    const orderTotal =
      Number(o.order_invoicing_summary?.order_grand_total) || Number(o.total_amount) || 0;
    if (orderTotal > 0 && bill > 0) {
      return Math.round((bill / orderTotal) * 10000) / 100;
    }
    return Number(inv.bill_percent ?? 0);
  }

  invoiceAmountDue(inv: Invoice, o: SalesOrder): number {
    if (this.isPartialPayment(o) && inv.bill_amount) {
      return Number(inv.bill_amount);
    }
    return Number(inv.grand_total ?? inv.total_amount ?? 0);
  }

  invoicePaidDisplay(inv: Invoice, o: SalesOrder): number {
    const due = this.invoiceAmountDue(inv, o);
    return Math.min(Number(inv.paid_amount ?? 0), due);
  }

  hasStockOutstandingLines(o: SalesOrder): boolean {
    if (!this.stockVerificationCompleted(o)) {
      return false;
    }
    return (o.items ?? []).some((line) => Number(line.stock_outstanding_qty ?? 0) > 0);
  }

  isOutstandingOrder(o: SalesOrder): boolean {
    if (o.status === 'PARTIALLY_FULFILLED') {
      return true;
    }
    return (o.items ?? []).some((line) => {
      const stockShort =
        this.stockVerificationCompleted(o) && Number(line.stock_outstanding_qty ?? 0) > 0;
      const invoiced = Number(line.invoiced_qty ?? 0);
      const outstanding = Number(line.outstanding_qty ?? 0);
      return stockShort || (invoiced > 0 && outstanding > 0);
    });
  }

  hasReservedReadyToInvoice(o: SalesOrder): boolean {
    return !!o.has_reserved_ready_to_invoice && this.isOutstandingOrder(o);
  }

  toInvoiceQty(item: SOItem): number {
    return lineToInvoiceQty(item);
  }

  hasStartedInvoicing(item: SOItem): boolean {
    return lineHasStartedInvoicing(item);
  }

  stockShortfallDisplay(o: SalesOrder, item: SOItem): StockOutstandingDisplay {
    return stockOutstandingDisplay(o, item, this.stockVerificationCompleted(o));
  }

  stockVerificationCompleted(o: SalesOrder): boolean {
    const pendingStatuses: SalesOrder['status'][] = [
      'NEW_ORDER',
      'SO_CREATED',
      'DRAFT',
      'STOCK_VERIFICATION',
    ];
    return (
      !pendingStatuses.includes(o.status) ||
      ['RESERVED', 'LOCKED', 'RELEASED'].includes(o.inventory_status ?? 'NONE')
    );
  }
}
