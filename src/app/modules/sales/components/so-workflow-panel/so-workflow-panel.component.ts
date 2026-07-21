import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { GenerateInvoiceData, FulfillmentInvoicePreview, FulfillmentInvoicePreviewLine, LinkedInvoiceSummary, SalesOrder } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PromptDialogService } from '../../../../core/services/prompt-dialog.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency } from '../../../../core/utils/format.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import {
  DELIVERY_METHODS,
  INVOICE_OTHER_COST_CATEGORIES,
  PAYMENT_METHODS,
} from '../../constants/sales.constants';
import { canRecordManualPaymentProof, canVerifySalesPayment, canGenerateSalesInvoice, canGenerateFulfillmentInvoice } from '../../utils/sales-permissions.util';

type ProofPreviewKind = 'pdf' | 'image' | 'unsupported';

const LOGISTICS_HANDLED_STATUSES: SalesOrder['status'][] = [
  'READY_FOR_PICKUP',
  'READY_FOR_DELIVERY',
  'VEHICLE_ASSIGNED',
  'THIRD_PARTY_ASSIGNED',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELIVERED',
];

@Component({
  selector: 'app-so-workflow-panel',
  imports: [DecimalPipe, FormsModule, RouterLink, ModalComponent],
  templateUrl: './so-workflow-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoWorkflowPanelComponent {
  private readonly sales = inject(SalesService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly promptDialog = inject(PromptDialogService);
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  readonly order = input.required<SalesOrder>();
  /** When true, only finance actions (e.g. generate invoice) are shown. */
  readonly financeOnly = input(false);
  readonly refreshed = output<void>();

  readonly paymentMethods = PAYMENT_METHODS;
  readonly deliveryMethods = DELIVERY_METHODS;
  readonly otherCostCategories = INVOICE_OTHER_COST_CATEGORIES;

  readonly showInvoiceModal = signal(false);
  readonly showManualPaymentModal = signal(false);
  readonly showProofPreviewModal = signal(false);
  readonly loadingProofPreview = signal(false);
  readonly proofPreviewTitle = signal('Payment proof');
  readonly proofPreviewKind = signal<ProofPreviewKind>('unsupported');
  readonly safeProofPreviewUrl = signal<SafeResourceUrl | null>(null);
  readonly proofPreviewDownloadUrl = signal<string | null>(null);

  readonly savingInvoice = signal(false);
  readonly savingManualPayment = signal(false);
  readonly showBalanceInvoiceModal = signal(false);
  readonly savingBalanceInvoice = signal(false);
  readonly savingFulfillmentInvoice = signal(false);
  readonly sendingToFinance = signal(false);
  readonly showFulfillmentInvoiceModal = signal(false);
  readonly loadingFulfillmentPreview = signal(false);
  readonly showWaiveCloseModal = signal(false);
  readonly savingWaiveClose = signal(false);
  readonly lastInvoiceId = signal<number | null>(null);

  fulfillmentPreview: FulfillmentInvoicePreview | null = null;
  readonly fulfillmentPriceChoice = signal<Record<number, 'original' | 'current'>>({});
  readonly formatCurrency = formatCurrency;

  balanceInvoicePercent = 100;
  waiveCloseReason = '';

  private proofPreviewBlobUrl: string | null = null;

  manualPayment = {
    amount: 0,
    payment_method: 'BANK_TRANSFER',
    reference_number: '',
    proof_notes: '',
    customer_reply_message: '',
  };
  manualPaymentFile: File | null = null;

  invoiceForm: {
    other_costs: Array<{ cost_name: string; description: string; amount: number; category: string }>;
  } = {
    other_costs: [],
  };

  constructor() {
    effect(() => {
      const order = this.order();
      if (order.invoice_id) {
        this.lastInvoiceId.set(order.invoice_id);
      }
    });
  }

  isLogisticsHandledStatus(status: SalesOrder['status']): boolean {
    return LOGISTICS_HANDLED_STATUSES.includes(status);
  }

  linkedInvoices(order = this.order()): LinkedInvoiceSummary[] {
    if (order.linked_invoices?.length) {
      return order.linked_invoices;
    }
    if (order.invoice_id && order.invoice_number) {
      return [
        {
          id: order.invoice_id,
          invoice_number: order.invoice_number,
          status: 'SENT',
          bill_percent: 100,
          bill_amount: order.invoice_grand_total ?? order.total_amount ?? 0,
          paid_amount: 0,
          invoice_date: null,
          sequence: 1,
          invoice_kind: 'INITIAL',
        },
      ];
    }
    return [];
  }

  hasLinkedInvoices(order = this.order()): boolean {
    return this.linkedInvoices(order).length > 0;
  }

  invoiceViewLink(invoiceId: number): string[] {
    return this.financeOnly()
      ? ['/finance/sales-invoices', String(invoiceId), 'view']
      : ['/sales/invoices', String(invoiceId), 'view'];
  }

  invoiceLinkLabel(inv: LinkedInvoiceSummary): string {
    if (!this.isPartialPaymentTerm()) {
      return inv.invoice_number;
    }
    const pct = this.invoicePercentOfOrder(inv);
    return pct != null ? `${inv.invoice_number} (${pct}%)` : inv.invoice_number;
  }

  /** True % of order for this installment (bill_amount / order total). */
  invoicePercentOfOrder(inv: LinkedInvoiceSummary, order = this.order()): number | null {
    const bill = Number(inv.bill_amount ?? 0);
    const orderTotal =
      Number(order.order_invoicing_summary?.order_grand_total) ||
      Number(order.total_amount) ||
      0;
    if (orderTotal > 0 && bill > 0) {
      return Math.round((bill / orderTotal) * 10000) / 100;
    }
    const stored = Number(inv.bill_percent);
    return Number.isFinite(stored) && stored > 0 ? stored : null;
  }

  deliveryTypeLabel(method?: string | null): string {
    if (!method) return 'Not set';
    return this.deliveryMethods.find((m) => m.value === method)?.label ?? method;
  }

  deliveryMethodLabel(order = this.order()): string {
    return this.deliveryTypeLabel(order.delivery_method);
  }

  linkedQuotationAlreadySent(order = this.order()): boolean {
    if (!order.quotation_id) return false;
    if (order.quotation_email_sent_at) return true;
    const status = order.quotation_status ?? '';
    return [
      'SENT',
      'WAITING_CUSTOMER',
      'QUOTATION_SENT',
      'ACCEPTED',
      'QUOTATION_ACCEPTED',
      'QUOTATION_APPROVED',
    ].includes(status);
  }

  dueAmount(order = this.order()): number {
    const unpaidInstallment = this.unpaidInvoiceBalance(order);
    if (unpaidInstallment != null) {
      return unpaidInstallment;
    }
    if (
      order.invoice_payment_term === 'PARTIAL_PAYMENT' &&
      order.invoice_deposit_amount
    ) {
      return Number(order.invoice_deposit_amount);
    }
    if (order.invoice_grand_total) {
      // Partial invoices often store full grand_total; prefer bill_amount when present
      // on the latest unpaid linked invoice (handled above). Fallback only.
      return Number(order.invoice_grand_total);
    }
    return Number(order.total_amount ?? 0);
  }

  /** Remaining amount on the oldest unpaid partial/balance invoice, if any. */
  unpaidInvoiceBalance(order = this.order()): number | null {
    const invoices = order.linked_invoices ?? [];
    for (const inv of invoices) {
      if (String(inv.status || '').toUpperCase() === 'DRAFT') {
        continue;
      }
      const bill = Number(inv.bill_amount ?? 0);
      const paid = Number(inv.paid_amount ?? 0);
      const balance = Math.max(bill - paid, 0);
      if (balance > 0.009) {
        return Math.round(balance * 100) / 100;
      }
    }
    return null;
  }

  paymentDueLabel(order = this.order()): string {
    const unpaid = this.unpaidInvoiceBalance(order);
    if (order.invoice_payment_term === 'PARTIAL_PAYMENT' || this.isPartialPaymentTerm(order)) {
      if (unpaid != null) {
        return `Amount due on current invoice installment: ${unpaid.toFixed(2)}`;
      }
      return `Deposit due (partial payment): ${this.dueAmount(order).toFixed(2)}`;
    }
    if (order.invoice_grand_total && order.invoice_grand_total !== order.total_amount) {
      return `Invoice total (incl. other costs): ${Number(order.invoice_grand_total).toFixed(2)}`;
    }
    return `Order total: ${Number(order.total_amount ?? 0).toFixed(2)}`;
  }

  pendingPaymentProof(order = this.order()) {
    const pending =
      order.pending_payment_proof ??
      order.payment_proofs?.find((p) => p.status === 'PENDING') ??
      null;
    if (!pending) return null;
    if (pending.proof_file_url) return pending;
    const full = order.payment_proofs?.find((p) => p.id === pending.id);
    if (full?.proof_file_url) {
      return { ...pending, proof_file_url: full.proof_file_url };
    }
    return pending;
  }

  /** Prefer installment due when a stale pending proof still holds the full order total. */
  displayProofAmount(proof: { amount?: string | number }): number {
    const amt = Number(proof.amount ?? 0);
    if (!this.isPartialPaymentTerm()) {
      return amt;
    }
    const due = this.dueAmount();
    if (due > 0 && amt > due + 0.009) {
      return due;
    }
    return amt;
  }

  canVerifyPayment(): boolean {
    return canVerifySalesPayment(this.auth);
  }

  canGenerateInvoice(): boolean {
    return canGenerateSalesInvoice(this.auth);
  }

  canGenerateFulfillmentInvoice(order = this.order()): boolean {
    if (!canGenerateFulfillmentInvoice(this.auth) && !this.canGenerateInvoice()) {
      return false;
    }
    return !!order.can_generate_fulfillment_invoice;
  }

  hasReservedReadyToInvoice(order = this.order()): boolean {
    return !!order.has_reserved_ready_to_invoice && this.isOutstandingOrder(order);
  }

  reservedReadyToInvoiceHint(order = this.order()): string {
    if (order.reserved_ready_to_invoice_hint) {
      return order.reserved_ready_to_invoice_hint;
    }
    if (this.isDeliverBeforeInvoiceTerm(order)) {
      return (
        'Inventory has reserved stock for the next wave. ' +
        'Logistics/pickup delivers first; Finance invoices after delivery (postpaid/COD).'
      );
    }
    return (
      'Inventory has reserved stock for the next wave. Send to Finance for invoicing.'
    );
  }

  /** Outstanding wave where stock is still short and Inventory has not reserved the next qty yet. */
  hasAwaitingReservation(order = this.order()): boolean {
    if (!this.isOutstandingOrder(order) || this.hasReservedReadyToInvoice(order)) {
      return false;
    }
    return (order.items ?? []).some((line) => {
      const stockOutstanding = Number(line.stock_outstanding_qty ?? 0);
      const fulfillable = Number(line.invoice_fulfillable_qty ?? 0);
      return stockOutstanding > 0 && fulfillable <= 0;
    });
  }

  awaitingReservationHint(order = this.order()): string {
    const lines = (order.items ?? [])
      .filter((line) => {
        const stockOutstanding = Number(line.stock_outstanding_qty ?? 0);
        const fulfillable = Number(line.invoice_fulfillable_qty ?? 0);
        return stockOutstanding > 0 && fulfillable <= 0;
      })
      .map((line) => `${line.item_code ?? 'Item'} x ${line.stock_outstanding_qty}`);
    const deliverFirst = this.isDeliverBeforeInvoiceTerm(order);
    if (!lines.length) {
      return deliverFirst
        ? 'Inventory must reserve the next wave before logistics/pickup can deliver (invoice follows delivery).'
        : 'Inventory must reserve the next wave before Sales can send this order to Finance.';
    }
    return deliverFirst
      ? `Awaiting inventory reservation: ${lines.join(', ')}. ` +
          'After reserve, logistics/pickup delivers — Finance invoices after delivery (postpaid/COD).'
      : `Awaiting inventory reservation: ${lines.join(', ')}. ` +
          'Send to Finance becomes available once the reserved quantity is ready to invoice.';
  }

  sendToFinance(): void {
    const order = this.order();
    this.sendingToFinance.set(true);
    this.sales
      .sendOrderToFinance(order.id)
      .pipe(finalize(() => this.sendingToFinance.set(false)))
      .subscribe({
        next: ({ message }) => {
          this.notification.success(message);
          this.refresh();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  waveInvoiceButtonLabel(order = this.order()): string {
    if (this.isPartialPaymentTerm(order)) {
      return 'Generate Wave Invoice';
    }
    return 'Generate Fulfillment Invoice';
  }

  hasStockOutstanding(order = this.order()): boolean {
    if (!this.stockVerificationCompleted(order)) {
      return false;
    }
    return (order.items ?? []).some((line) => Number(line.stock_outstanding_qty ?? 0) > 0);
  }

  stockVerificationCompleted(order = this.order()): boolean {
    const pendingStatuses: SalesOrder['status'][] = [
      'NEW_ORDER',
      'SO_CREATED',
      'DRAFT',
      'STOCK_VERIFICATION',
    ];
    return (
      !pendingStatuses.includes(order.status) ||
      ['RESERVED', 'LOCKED', 'RELEASED'].includes(order.inventory_status ?? 'NONE')
    );
  }

  /**
   * Genuine multi-wave / outstanding order across its whole lifecycle: stock
   * still short, a prior invoice wave exists with a balance left, or the order
   * is partially fulfilled. Keeps outstanding wording for real
   * outstanding orders on every payment mode; plain wording otherwise.
   */
  isOutstandingOrder(order = this.order()): boolean {
    if (order.status === 'PARTIALLY_FULFILLED') {
      return true;
    }
    return (order.items ?? []).some((line) => {
      const stockShort =
        this.stockVerificationCompleted(order) && Number(line.stock_outstanding_qty ?? 0) > 0;
      const invoiced = Number(line.invoiced_qty ?? 0);
      const outstanding = Number(line.outstanding_qty ?? 0);
      const partialWave = invoiced > 0 && outstanding > 0;
      return stockShort || partialWave;
    });
  }

  invoicePreviewLines(order = this.order()): {
    id?: number;
    item_code?: string;
    item_name?: string;
    invoiceQty: number;
    reserved: number;
    stockOutstanding: number;
  }[] {
    return (order.items ?? [])
      .map((line) => ({
        id: line.id,
        item_code: line.item_code,
        item_name: line.item_name,
        invoiceQty: Number(line.invoice_fulfillable_qty ?? 0),
        reserved: Number(line.quantity_reserved ?? 0),
        stockOutstanding: Number(line.stock_outstanding_qty ?? 0),
      }))
      .filter((line) => line.invoiceQty > 0);
  }

  isQtyFulfillmentTerm(order = this.order()): boolean {
    const term = order.payment_term || order.invoice_payment_term;
    return term === 'PREPAID' || term === 'POSTPAID';
  }

  generateFulfillmentInvoice(): void {
    this.openFulfillmentInvoiceModal();
  }

  openFulfillmentInvoiceModal(): void {
    const order = this.order();
    this.loadingFulfillmentPreview.set(true);
    this.sales.getFulfillmentInvoicePreview(order.id).subscribe({
      next: (preview) => {
        this.initializeFulfillmentPricing(preview);
        this.showFulfillmentInvoiceModal.set(true);
        this.loadingFulfillmentPreview.set(false);
      },
      error: (e) => {
        this.loadingFulfillmentPreview.set(false);
        this.notification.error(getApiErrorMessage(e));
      },
    });
  }

  private initializeFulfillmentPricing(preview: FulfillmentInvoicePreview): void {
    this.fulfillmentPreview = preview;
    const choices: Record<number, 'original' | 'current'> = {};
    for (const line of preview.lines) {
      if (line.price_changed && line.current_unit_price) {
        choices[line.line_id] =
          line.default_unit_price === line.current_unit_price ? 'current' : 'original';
      } else {
        choices[line.line_id] = 'original';
      }
    }
    this.fulfillmentPriceChoice.set(choices);
  }

  setFulfillmentPrice(lineId: number, choice: 'original' | 'current'): void {
    this.fulfillmentPriceChoice.update((current) => ({ ...current, [lineId]: choice }));
  }

  fulfillmentUnitPrice(line: FulfillmentInvoicePreviewLine): number {
    const choice = this.fulfillmentPriceChoice()[line.line_id] ?? 'original';
    if (choice === 'current' && line.current_unit_price) {
      return Number(line.current_unit_price);
    }
    return Number(line.original_unit_price);
  }

  fulfillmentLineTotal(line: FulfillmentInvoicePreviewLine): number {
    return this.fulfillmentUnitPrice(line) * Number(line.quantity);
  }

  fulfillmentPreviewTotal(): number {
    if (!this.fulfillmentPreview) {
      return 0;
    }
    return this.fulfillmentPreview.lines.reduce(
      (sum, line) => sum + this.fulfillmentLineTotal(line),
      0,
    );
  }

  submitFulfillmentInvoice(): void {
    const order = this.order();
    const preview = this.fulfillmentPreview;
    if (!preview?.lines.length) {
      this.notification.error('No invoice lines available.');
      return;
    }
    const line_prices = preview.lines.map((line) => ({
      line_id: line.line_id,
      unit_price: this.fulfillmentUnitPrice(line),
    }));
    this.savingFulfillmentInvoice.set(true);
    this.sales
      .generateFulfillmentInvoice(order.id, { line_prices })
      .pipe(finalize(() => this.savingFulfillmentInvoice.set(false)))
      .subscribe({
        next: ({ data, message }) => {
          this.showFulfillmentInvoiceModal.set(false);
          this.fulfillmentPreview = null;
          this.lastInvoiceId.set(data.invoice_id);
          this.notification.success(message);
          this.refresh();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  isDeliverBeforeInvoiceTerm(order = this.order()): boolean {
    const term = order.payment_term || order.invoice_payment_term;
    return term === 'POSTPAID' || term === 'COD';
  }

  isPartialPaymentTerm(order = this.order()): boolean {
    const term = order.payment_term || order.invoice_payment_term;
    return term === 'PARTIAL_PAYMENT';
  }

  canGenerateBalanceInvoice(order = this.order()): boolean {
    return (
      this.financeOnly() &&
      this.canGenerateInvoice() &&
      !!order.can_generate_balance_invoice &&
      !(this.isOutstandingOrder(order) && this.canGenerateFulfillmentInvoice(order))
    );
  }

  balanceInvoiceMaxPercent(order = this.order()): number {
    const summary = order.order_invoicing_summary;
    if (!summary) {
      return 100;
    }
    const nextPct = Number(summary.next_post_delivery_balance_pending_percent);
    if (Number.isFinite(nextPct) && nextPct > 0) {
      return Math.round(nextPct * 100) / 100;
    }
    const pendingPct = Number(summary.post_delivery_balance_pending_percent);
    if (Number.isFinite(pendingPct) && pendingPct > 0) {
      return Math.round(pendingPct * 100) / 100;
    }
    const pendingBalance = Number(
      summary.next_post_delivery_balance_pending ?? summary.post_delivery_balance_pending ?? 0,
    );
    const orderTotal = Number(summary.order_grand_total);
    const remaining = Number(summary.remaining_to_invoice_percent);
    if (pendingBalance > 0 && orderTotal > 0) {
      const fromPending = Math.min((pendingBalance / orderTotal) * 100, 100);
      return Math.round(fromPending * 100) / 100;
    }
    if (Number.isFinite(remaining) && remaining > 0) {
      return Math.round(remaining * 100) / 100;
    }
    return 100;
  }

  openBalanceInvoiceModal(): void {
    this.balanceInvoicePercent = this.balanceInvoiceMaxPercent();
    this.showBalanceInvoiceModal.set(true);
  }

  submitBalanceInvoice(): void {
    const order = this.order();
    const maxPct = this.balanceInvoiceMaxPercent(order);
    const pct = Math.round(Number(this.balanceInvoicePercent) * 100) / 100;
    if (!Number.isFinite(pct) || pct <= 0) {
      this.notification.error('Enter a percent greater than 0.');
      return;
    }
    if (pct > maxPct) {
      this.notification.error(
        `Only ${maxPct}% remains to be invoiced. Enter a value from 0.01 to ${maxPct}.`,
      );
      return;
    }
    this.savingBalanceInvoice.set(true);
    this.sales
      .generateBalanceInvoice(order.id, { remaining_percent: pct })
      .pipe(finalize(() => this.savingBalanceInvoice.set(false)))
      .subscribe({
        next: ({ data, message }) => {
          this.showBalanceInvoiceModal.set(false);
          this.lastInvoiceId.set(data.invoice_id);
          this.notification.success(message);
          this.refresh();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  canGenerateInvoiceForOrder(order = this.order()): boolean {
    if (typeof order.can_generate_invoice === 'boolean') {
      return order.can_generate_invoice;
    }
    if (this.isDeliverBeforeInvoiceTerm(order)) {
      return [
        'DELIVERED',
        'DELIVERY_CONFIRMED',
        'COMPLETED_PICKUP',
        'COMPLETED_COMPANY',
        'COMPLETED_THIRD_PARTY',
      ].includes(order.status) && !order.invoice_id;
    }
    return order.status === 'QUOTATION_ACCEPTED' && !order.invoice_id;
  }

  invoiceWorkflowHint(order = this.order()): string {
    if (order.invoice_workflow_hint) {
      return order.invoice_workflow_hint;
    }
    if (this.isDeliverBeforeInvoiceTerm(order)) {
      return 'Complete delivery first — customer invoice is generated and sent after delivery.';
    }
    return 'Finance generates the invoice after quotation acceptance; delivery follows payment.';
  }

  canCloseOrder(order = this.order()): boolean {
    // Partial / advance: never close until the full order is paid.
    if (this.isPartialPaymentTerm(order) && order.payment_status !== 'PAID') {
      return false;
    }
    if (order.can_generate_balance_invoice) {
      return false;
    }
    if (typeof order.can_close_order === 'boolean') {
      return order.can_close_order;
    }
    if (this.isOrderCompleted(order)) {
      return false;
    }
    if (order.has_outstanding_fulfillment) {
      return false;
    }
    if (order.status !== 'DELIVERY_CONFIRMED') {
      return false;
    }
    if (order.close_order_blocker) {
      return false;
    }
    return true;
  }

  hasOutstandingFulfillment(order = this.order()): boolean {
    return !!order.has_outstanding_fulfillment;
  }

  canWaiveOutstandingClose(order = this.order()): boolean {
    return !!order.can_waive_outstanding_close;
  }

  openWaiveCloseModal(): void {
    this.waiveCloseReason = '';
    this.showWaiveCloseModal.set(true);
  }

  outstandingFulfillmentHint(order = this.order()): string {
    return (
      order.outstanding_fulfillment_hint ||
      'Complete remaining invoicing and delivery before closing this order.'
    );
  }

  closeOrderBlocker(order = this.order()): string {
    if (order.close_order_blocker) {
      return order.close_order_blocker;
    }
    if (!this.canCloseOrder(order)) {
      if (this.isDeliverBeforeInvoiceTerm(order) && !order.invoice_id) {
        return 'Generate and issue the customer invoice after delivery before closing.';
      }
      if (this.isDeliverBeforeInvoiceTerm(order) && order.payment_status !== 'PAID') {
        return order.payment_term === 'COD'
          ? 'Cash on delivery — record full customer payment before closing.'
          : 'Record full customer payment before closing this postpaid order.';
      }
      if (this.isPartialPaymentTerm(order) && order.payment_status !== 'PAID') {
        return (
          'Partial payment order — issue all invoices and collect the full ' +
          'order amount before closing.'
        );
      }
    }
    return '';
  }

  isOrderCompleted(order = this.order()): boolean {
    return (
      order.status === 'COMPLETED_PICKUP' ||
      order.status === 'COMPLETED_COMPANY' ||
      order.status === 'COMPLETED_THIRD_PARTY'
    );
  }

  showCloseOrderSection(order = this.order()): boolean {
    // Sales: while finance still needs a balance invoice, show that CTA — not Close Order.
    if (!this.financeOnly() && order.can_generate_balance_invoice) {
      return false;
    }
    return (
      order.status === 'DELIVERY_CONFIRMED' ||
      this.isOrderCompleted(order) ||
      order.status === 'PARTIALLY_FULFILLED' ||
      (this.isPartialPaymentTerm(order) &&
        order.payment_status === 'PAID' &&
        order.delivery_status === 'DELIVERED')
    );
  }

  canRecordManualPayment(order = this.order()): boolean {
    if (typeof order.can_record_payment_proof === 'boolean') {
      return order.can_record_payment_proof;
    }
    return canRecordManualPaymentProof(this.auth) && this.isCollectingPayment(order);
  }

  isCollectingPayment(order = this.order()): boolean {
    if (typeof order.payment_collection_phase === 'boolean') {
      return order.payment_collection_phase;
    }
    if (order.payment_status === 'PAID') {
      return false;
    }
    if (order.status === 'AWAITING_PAYMENT') {
      return true;
    }
    return (
      this.isDeliverBeforeInvoiceTerm(order) &&
      !!order.invoice_id &&
      ['DELIVERY_CONFIRMED', 'DELIVERED', 'INVOICE_GENERATED', 'AWAITING_PAYMENT'].includes(
        order.status,
      )
    );
  }

  openManualPaymentModal(): void {
    const order = this.order();
    this.manualPayment = {
      amount: this.dueAmount(order),
      payment_method: 'BANK_TRANSFER',
      reference_number: '',
      proof_notes: '',
      customer_reply_message: '',
    };
    this.manualPaymentFile = null;
    this.showManualPaymentModal.set(true);
  }

  onManualPaymentFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.manualPaymentFile = input.files?.[0] ?? null;
  }

  paymentMethodLabel(method?: string): string {
    return this.paymentMethods.find((m) => m.value === method)?.label ?? method ?? '—';
  }

  sourceLabel(source?: string, sourceDisplay?: string): string {
    if (sourceDisplay) return sourceDisplay;
    const map: Record<string, string> = {
      INTERNAL: 'Internal',
      CUSTOMER_PORTAL: 'Customer Portal',
      CUSTOMER_EMAIL: 'Customer Email',
    };
    return source ? (map[source] ?? source) : '—';
  }

  private proofPreviewKindFor(url: string): ProofPreviewKind {
    const path = url.split('?')[0].toLowerCase();
    if (path.endsWith('.pdf')) return 'pdf';
    if (/\.(jpe?g|png|gif|webp)$/.test(path)) return 'image';
    return 'unsupported';
  }

  private proofPreviewFilename(url: string): string {
    const segment = url.split('?')[0].split('/').pop();
    return segment || 'payment-proof';
  }

  openPaymentProofPreview(url: string): void {
    if (this.loadingProofPreview()) return;
    this.closePaymentProofPreview(false);
    this.loadingProofPreview.set(true);
    this.proofPreviewDownloadUrl.set(url);
    const filename = this.proofPreviewFilename(url);
    this.proofPreviewTitle.set(filename);
    this.proofPreviewKind.set(this.proofPreviewKindFor(url));

    this.http
      .get(url, { responseType: 'blob' })
      .pipe(finalize(() => this.loadingProofPreview.set(false)))
      .subscribe({
        next: (blob) => {
          const blobUrl = URL.createObjectURL(blob);
          this.proofPreviewBlobUrl = blobUrl;
          this.safeProofPreviewUrl.set(
            this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl),
          );
          this.showProofPreviewModal.set(true);
        },
        error: () => this.notification.error('Unable to load payment proof attachment.'),
      });
  }

  closePaymentProofPreview(revoke = true): void {
    if (revoke && this.proofPreviewBlobUrl) {
      URL.revokeObjectURL(this.proofPreviewBlobUrl);
    }
    this.proofPreviewBlobUrl = null;
    this.safeProofPreviewUrl.set(null);
    this.proofPreviewDownloadUrl.set(null);
    this.showProofPreviewModal.set(false);
    this.proofPreviewTitle.set('Payment proof');
    this.proofPreviewKind.set('unsupported');
  }

  private refresh(): void {
    this.refreshed.emit();
  }

  openInvoiceModal(): void {
    if (!this.financeOnly() || !this.canGenerateInvoice() || !this.canGenerateInvoiceForOrder()) {
      return;
    }
    this.invoiceForm = { other_costs: [] };
    this.fulfillmentPreview = null;
    this.fulfillmentPriceChoice.set({});
    if (this.isOutstandingOrder() && this.isQtyFulfillmentTerm()) {
      this.loadingFulfillmentPreview.set(true);
      this.sales.getFulfillmentInvoicePreview(this.order().id).subscribe({
        next: (preview) => {
          this.initializeFulfillmentPricing(preview);
          this.loadingFulfillmentPreview.set(false);
          this.showInvoiceModal.set(true);
        },
        error: (e) => {
          this.loadingFulfillmentPreview.set(false);
          this.notification.error(getApiErrorMessage(e));
        },
      });
      return;
    }
    this.showInvoiceModal.set(true);
  }

  closeInvoiceModal(): void {
    this.showInvoiceModal.set(false);
    this.fulfillmentPreview = null;
    this.fulfillmentPriceChoice.set({});
  }

  addOtherCost(): void {
    this.invoiceForm.other_costs = [
      ...this.invoiceForm.other_costs,
      { cost_name: '', description: '', amount: 0, category: 'OTHER' },
    ];
  }

  removeOtherCost(index: number): void {
    this.invoiceForm.other_costs = this.invoiceForm.other_costs.filter((_, i) => i !== index);
  }

  otherCostsTotal(): number {
    return this.invoiceForm.other_costs.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }

  submit(): void {
    this.run(() => this.sales.submitSalesOrder(this.order().id), 'Order submitted');
  }

  sendQuotationWithPoReference(): void {
    const lpo = (this.order().lpo_number ?? '').trim();
    if (lpo) {
      this.sendQuotation(lpo);
      return;
    }

    this.promptDialog.open({
      title: 'Enter Customer PO Reference',
      message: 'A customer PO or LPO reference is required before sending this quotation.',
      label: 'PO / LPO reference number',
      placeholder: 'Enter the customer reference number',
      required: true,
      confirmLabel: 'Send Quotation',
    }).subscribe((reference) => {
      if (!reference?.trim()) return;
      this.sendQuotation(reference.trim());
    });
  }

  private sendQuotation(lpo: string): void {
    this.sales.sendOrderQuotation(this.order().id, { lpo_number: lpo }).subscribe({
      next: ({ message }) => {
        this.notification.success(message);
        this.refresh();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  proceedToGenerateInvoice(): void {
    if (this.financeOnly()) {
      return;
    }
    this.confirm
      .open({
        title: 'Send to Finance',
        message:
          'Mark this order ready for Finance to generate the invoice without emailing the quotation? Use only for trusted customers or when a PO is already confirmed.',
        confirmLabel: 'Send to Finance',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.sales.proceedOrderToInvoice(this.order().id).subscribe({
          next: () => {
            this.notification.success('Order sent to Finance for invoice generation');
            this.refresh();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  acceptQuotation(): void {
    this.run(() => this.sales.acceptOrderQuotation(this.order().id), 'Quotation accepted');
  }

  rejectQuotation(): void {
    this.promptDialog.open({
      title: 'Reject Quotation',
      message: 'You may provide a reason for rejecting this quotation.',
      label: 'Rejection reason',
      placeholder: 'Enter an optional reason',
      multiline: true,
      confirmLabel: 'Reject Quotation',
    }).subscribe((reason) => {
      if (reason === null) return;
      this.run(
        () => this.sales.rejectOrderQuotation(this.order().id, reason.trim()),
        'Quotation rejected',
      );
    });
  }

  submitGenerateInvoice(): void {
    if (!this.financeOnly() || !this.canGenerateInvoice()) {
      this.notification.error('Only Finance can generate invoices from sales orders.');
      return;
    }
    for (const row of this.invoiceForm.other_costs) {
      if (!row.cost_name.trim()) {
        this.notification.error('Each other cost needs a description.');
        return;
      }
      if (!Number(row.amount) || Number(row.amount) <= 0) {
        this.notification.error('Each other cost needs a valid amount.');
        return;
      }
    }

    const payload: GenerateInvoiceData = {
      send_email: true,
      other_costs: this.invoiceForm.other_costs.map((row) => ({
        cost_name: row.cost_name.trim(),
        description: row.description.trim(),
        amount: Number(row.amount),
        category: row.category,
      })),
    };
    if (this.isOutstandingOrder() && this.fulfillmentPreview?.lines.length) {
      payload.line_prices = this.fulfillmentPreview.lines.map((line) => ({
        line_id: line.line_id,
        unit_price: this.fulfillmentUnitPrice(line),
      }));
    }

    this.savingInvoice.set(true);
    this.sales
      .generateOrderInvoice(this.order().id, payload)
      .pipe(finalize(() => this.savingInvoice.set(false)))
      .subscribe({
        next: ({ data, message }) => {
          this.notification.success(message);
          this.lastInvoiceId.set(data.invoice_id);
          this.closeInvoiceModal();
          this.refresh();
        },
        error: () => {},
      });
  }

  submitManualPayment(): void {
    const reference = this.manualPayment.reference_number.trim();
    if (!reference) {
      this.notification.error('Payment reference number is required.');
      return;
    }
    const amount = Number(this.manualPayment.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.notification.error('Enter a valid payment amount.');
      return;
    }
    this.savingManualPayment.set(true);
    this.sales
      .submitOrderPayment(this.order().id, {
        amount,
        payment_method: this.manualPayment.payment_method,
        reference_number: reference,
        proof_notes: this.manualPayment.proof_notes.trim(),
        customer_reply_message: this.manualPayment.customer_reply_message.trim(),
        source: 'CUSTOMER_EMAIL',
        proof_file: this.manualPaymentFile ?? undefined,
      })
      .pipe(finalize(() => this.savingManualPayment.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Manual payment recorded — verify to confirm receipt.');
          this.showManualPaymentModal.set(false);
          this.refresh();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  verifyPayment(approved: boolean): void {
    const proof = this.pendingPaymentProof();
    if (!proof) {
      this.notification.error('No pending payment proof to verify.');
      return;
    }
    if (approved) {
      this.submitPaymentVerification(proof.id, true, '');
      return;
    }
    this.promptDialog.open({
      title: 'Reject Payment Proof',
      message: 'Provide the reason this payment proof could not be verified.',
      label: 'Failure reason',
      placeholder: 'Explain why verification failed',
      required: true,
      multiline: true,
      confirmLabel: 'Reject Proof',
    }).subscribe((reason) => {
      if (!reason?.trim()) return;
      this.submitPaymentVerification(proof.id, false, reason.trim());
    });
  }

  private submitPaymentVerification(proofId: number, approved: boolean, reason: string): void {
    this.sales
      .verifyOrderPayment(this.order().id, {
        proof_id: proofId,
        approved,
        reason,
      })
      .subscribe({
        next: ({ message }) => {
          this.notification.success(message);
          this.refresh();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  closeOrder(): void {
    this.run(() => this.sales.closeSalesOrder(this.order().id), 'Order closed');
  }

  submitWaiveClose(): void {
    const reason = this.waiveCloseReason.trim();
    if (reason.length < 5) {
      this.notification.error('Enter a reason (at least 5 characters).');
      return;
    }
    this.savingWaiveClose.set(true);
    this.sales
      .closeSalesOrder(this.order().id, { waive_outstanding: true, reason })
      .pipe(finalize(() => this.savingWaiveClose.set(false)))
      .subscribe({
        next: () => {
          this.showWaiveCloseModal.set(false);
          this.notification.success('Order closed — remaining outstanding waived.');
          this.refresh();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  private run<T>(fn: () => import('rxjs').Observable<T>, successMsg: string): void {
    fn().subscribe({
      next: () => {
        this.notification.success(successMsg);
        this.refresh();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
