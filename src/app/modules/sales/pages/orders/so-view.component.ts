import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Invoice, SalesOrder, SOItem } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PromptDialogService } from '../../../../core/services/prompt-dialog.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { downloadBlob } from '../../../../core/utils/download.util';
import { handleScopedRecordLoadError } from '../../../../core/utils/workspace-empty-state.util';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { CompanyWorkspaceEmptyStateComponent } from '../../../../shared/components/company-workspace-empty-state/company-workspace-empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { SoWorkflowPanelComponent } from '../../components/so-workflow-panel/so-workflow-panel.component';
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';
import { WORKFLOW_STEPS, DELIVERY_METHODS, INVOICE_PAYMENT_TERMS, salesOrderIsEditable } from '../../constants/sales.constants';
import { orderWorkflowIndex, orderWorkflowSteps, isPartialPaymentTerm, orderPaidPercent } from '../../utils/order-workflow.util';
import {
  hasStartedInvoicing as lineHasStartedInvoicing,
  stockOutstandingDisplay,
  StockOutstandingDisplay,
  toInvoiceQty as lineToInvoiceQty,
} from '../../utils/order-qty-display.util';
import { canApproveSO, canCreateQuotation, canRecordPayment } from '../../utils/sales-permissions.util';
import { formatExchangeRateLabel, isForeignCurrency } from '../../utils/sales-currency.util';

type SoTab = 'details' | 'deliveries' | 'invoices' | 'activity';

@Component({
  selector: 'app-so-view',
  imports: [
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    WorkflowStepperComponent,
    SoWorkflowPanelComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
    CompanyWorkspaceEmptyStateComponent,
  ],
  templateUrl: './so-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sales = inject(SalesService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly promptDialog = inject(PromptDialogService);

  readonly order = signal<SalesOrder | null>(null);
  readonly invoices = signal<Invoice[]>([]);
  readonly loading = signal(true);
  readonly loadingInvoices = signal(false);
  readonly exportingPdf = signal(false);
  readonly error = signal(false);
  readonly notInWorkspace = signal(false);
  readonly activeTab = signal<SoTab>('details');
  readonly orderSteps = WORKFLOW_STEPS.order;

  orderStepsFor(o: SalesOrder): string[] {
    return orderWorkflowSteps(o.payment_term);
  }

  workflowIndex(o: SalesOrder): number {
    return orderWorkflowIndex(o.status, o.payment_term, o);
  }

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly formatExchangeRateLabel = formatExchangeRateLabel;
  readonly isForeignCurrency = isForeignCurrency;
  readonly salesOrderIsEditable = salesOrderIsEditable;
  readonly canManage = () => canCreateQuotation(this.auth);
  readonly canConfirm = () => canApproveSO(this.auth);
  readonly showWorkflowPanel = () => {
    const o = this.order();
    if (!o) return false;
    if (o.status === 'CANCELLED') return false;
    const hasInvoices = (o.linked_invoices?.length ?? 0) > 0 || !!o.invoice_id;
    if (o.status.startsWith('COMPLETED')) {
      return hasInvoices;
    }
    return canCreateQuotation(this.auth) || (canRecordPayment(this.auth) && o.status === 'AWAITING_PAYMENT');
  };

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
        next: (o) => this.order.set(o),
        error: (e) => {
          handleScopedRecordLoadError(e, this.error, this.notInWorkspace);
          if (this.error()) {
            this.notification.error(getApiErrorMessage(e));
          }
        },
      });
  }

  setTab(tab: SoTab): void {
    this.activeTab.set(tab);
    if (tab === 'invoices' && !this.invoices().length) {
      this.loadInvoices();
    }
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

  loadInvoices(): void {
    const o = this.order();
    if (!o) return;
    this.loadingInvoices.set(true);
    this.sales
      .getInvoices({ sales_order: o.id, page_size: 50 })
      .pipe(finalize(() => this.loadingInvoices.set(false)))
      .subscribe({
        next: (d) => this.invoices.set(d.results),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  isActiveDelivery(status: string): boolean {
    return [
      'VEHICLE_ASSIGNED',
      'THIRD_PARTY_ASSIGNED',
      'DISPATCHED',
      'IN_TRANSIT',
      'DELIVERED',
      'DELIVERY_CONFIRMED',
    ].includes(status);
  }

  deliveryDestination(o: SalesOrder): string {
    return o.requested_delivery_location || o.delivery_address || '—';
  }

  isQuotationStage(status: string): boolean {
    return [
      'QUOTATION_PREP',
      'QUOTATION_SENT',
      'WAITING_CUSTOMER',
      'QUOTATION_ACCEPTED',
    ].includes(status);
  }

  orderGrandTotal(o: SalesOrder): number {
    return Number(o.total_amount ?? 0);
  }

  deliveryTypeLabel(method?: string | null): string {
    if (!method) return '—';
    return DELIVERY_METHODS.find((m) => m.value === method)?.label ?? method;
  }

  paymentModeLabel(term?: string | null, display?: string | null): string {
    if (display) return display;
    if (!term) return '—';
    return INVOICE_PAYMENT_TERMS.find((t) => t.value === term)?.label ?? term;
  }

  isPartialPayment(o: SalesOrder): boolean {
    return isPartialPaymentTerm(o.payment_term);
  }

  paymentStatusLabel(o: SalesOrder): string {
    if (o.payment_status === 'PARTIAL') return 'Partial Paid';
    if (o.payment_status === 'PAID') return 'Paid';
    if (o.payment_status === 'UNPAID') return 'Unpaid';
    return '';
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

  toInvoiceQty(item: SOItem): number {
    return lineToInvoiceQty(item);
  }

  hasStartedInvoicing(item: SOItem): boolean {
    return lineHasStartedInvoicing(item);
  }

  stockShortfallDisplay(o: SalesOrder, item: SOItem): StockOutstandingDisplay {
    return stockOutstandingDisplay(o, item, this.stockVerificationCompleted(o));
  }

  /**
   * True for a genuine multi-wave / outstanding order across its whole lifecycle:
   * either a line is still short of stock (waiting-stock), a prior invoice wave
   * exists while a balance remains, or the order is partially fulfilled.
   * Drives wave/outstanding wording so a fully-stocked, deliver-first,
   * single-wave order doesn't show outstanding-order messaging — while any real
   * outstanding order (any payment mode) keeps the full outstanding UI.
   */
  isOutstandingOrder(o: SalesOrder): boolean {
    if (o.status === 'PARTIALLY_FULFILLED') {
      return true;
    }
    return (o.items ?? []).some((line) => {
      const stockShort = this.stockVerificationCompleted(o) && Number(line.stock_outstanding_qty ?? 0) > 0;
      const invoiced = Number(line.invoiced_qty ?? 0);
      const outstanding = Number(line.outstanding_qty ?? 0);
      const partialWave = invoiced > 0 && outstanding > 0;
      return stockShort || partialWave;
    });
  }

  hasReservedReadyToInvoice(o: SalesOrder): boolean {
    return !!o.has_reserved_ready_to_invoice && this.isOutstandingOrder(o);
  }

  hasAwaitingReservation(o: SalesOrder): boolean {
    if (!this.isOutstandingOrder(o) || this.hasReservedReadyToInvoice(o)) {
      return false;
    }
    return (o.items ?? []).some((line) => {
      const stockOutstanding = Number(line.stock_outstanding_qty ?? 0);
      const fulfillable = Number(line.invoice_fulfillable_qty ?? 0);
      return stockOutstanding > 0 && fulfillable <= 0;
    });
  }

  awaitingReservationHint(o: SalesOrder): string {
    const lines = (o.items ?? [])
      .filter((line) => {
        const stockOutstanding = Number(line.stock_outstanding_qty ?? 0);
        const fulfillable = Number(line.invoice_fulfillable_qty ?? 0);
        return stockOutstanding > 0 && fulfillable <= 0;
      })
      .map((line) => `${line.item_code ?? 'Item'} x ${line.stock_outstanding_qty}`);
    if (!lines.length) {
      return 'Inventory must reserve the next wave before Sales can send this order to Finance.';
    }
    return (
      `Awaiting inventory reservation: ${lines.join(', ')}. ` +
      'Send to Finance becomes available once the reserved quantity is ready to invoice.'
    );
  }

  advancePaidLabel(o: SalesOrder): string {
    const paidPct = orderPaidPercent(o);
    // Prefer actual paid % — never show Fully Paid from a deposit-only PAID badge.
    if (paidPct >= 100) {
      return '100% (Fully Paid)';
    }
    if (paidPct > 0) {
      if (this.isPartialPayment(o) || o.payment_status === 'PARTIAL') {
        return `${paidPct.toFixed(2)}% paid (Partial)`;
      }
      return `${paidPct.toFixed(2)}% paid`;
    }
    const deposit = Number(o.deposit_percent ?? 0);
    return deposit > 0 ? `${deposit}% deposit due` : '—';
  }

  cancelOrder(): void {
    const o = this.order();
    if (!o) return;
    this.promptDialog.open({
      title: 'Cancel Sales Order',
      message: `Provide a reason for cancelling ${o.so_number}.`,
      label: 'Cancellation reason',
      placeholder: 'Explain why this order is being cancelled',
      required: true,
      multiline: true,
      confirmLabel: 'Cancel Order',
    }).subscribe((reason) => {
      if (!reason?.trim()) return;
      this.sales.cancelSalesOrder(o.id, reason.trim()).subscribe({
        next: () => {
          this.notification.success('Sales order cancelled');
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
    });
  }
}
