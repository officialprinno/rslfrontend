import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  GoodsReceivedNote,
  PaymentMode,
  PaymentRelease,
  PaymentReleaseStage,
  POClosureChecklist,
  PurchaseOrder,
  SupplierInvoice,
  ThreeWayMatchRecord,
} from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyContextService } from '../../../../core/services/company-context.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { PromptDialogService } from '../../../../core/services/prompt-dialog.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { downloadBlob } from '../../../../core/utils/download.util';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { printDocument } from '../../../../core/utils/procurement-pdf.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { FinanceNavComponent } from '../../../finance/components/finance-nav/finance-nav.component';
import { InventoryNavComponent } from '../../../inventory/components/inventory-nav/inventory-nav.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';
import { PAYMENT_MODES, WORKFLOW_STEPS } from '../../constants/procurement.constants';
import {
  canClosePO,
  canCreatePaymentRelease,
  canGmFinancialReview,
  canManageGRN,
  canManagePO,
  canReleasePayment,
  canSendPO,
  canThreeWayMatch,
} from '../../utils/procurement-permissions.util';
import {
  buildPaymentReadiness,
  closureHintForPaymentMode,
  paymentReadinessComplete,
} from '../../utils/payment-readiness.util';

@Component({
  selector: 'app-po-view',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    ProcurementNavComponent,
    FinanceNavComponent,
    InventoryNavComponent,
    WorkflowStepperComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './po-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly procurement = inject(ProcurementService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly companyContext = inject(CompanyContextService);
  private readonly promptDialog = inject(PromptDialogService);

  readonly po = signal<PurchaseOrder | null>(null);
  readonly financeContext = signal(false);
  readonly inventoryContext = signal(false);
  readonly closureChecklist = signal<POClosureChecklist | null>(null);
  readonly paymentReleases = signal<PaymentRelease[]>([]);
  readonly supplierInvoices = signal<SupplierInvoice[]>([]);
  readonly threeWayMatches = signal<ThreeWayMatchRecord[]>([]);
  readonly grns = signal<GoodsReceivedNote[]>([]);
  readonly showPaymentForm = signal(false);
  readonly showMatchForm = signal(false);
  readonly exportingPdf = signal(false);

  readonly poSteps = WORKFLOW_STEPS.po;
  readonly paymentModes = PAYMENT_MODES;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly canManage = () => canManagePO(this.auth);
  readonly canSend = () => canSendPO(this.auth);
  readonly canGm = () => canGmFinancialReview(this.auth);
  readonly canFinance = () => canReleasePayment(this.auth);
  readonly canCreatePayment = () => canCreatePaymentRelease(this.auth);
  readonly canMatch = () => canThreeWayMatch(this.auth);
  readonly canClose = () => canClosePO(this.auth);
  readonly canReceive = () => canManageGRN(this.auth, this.companyContext);

  paymentStage: PaymentReleaseStage = 'FULL';
  paymentAmount = 0;
  paymentCurrency = 'TZS';
  paymentExchangeRate: number | null = null;
  paymentInvoiceId: number | null = null;
  matchGrnId: number | null = null;
  matchType: 'FULL' | 'COD_QUICK' = 'FULL';
  matchInvoiceId: number | null = null;

  ngOnInit(): void {
    this.financeContext.set(
      this.route.snapshot.data['financeContext'] === true ||
        this.router.url.includes('/finance/purchase-orders'),
    );
    this.inventoryContext.set(
      this.route.snapshot.data['inventoryContext'] === true ||
        this.router.url.includes('/inventory/purchase-orders'),
    );
    this.load();
  }

  load(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.procurement.getPurchaseOrder(id).subscribe({
      next: (p) => {
        this.po.set(p);
        this.paymentCurrency = p.currency_code;
        this.paymentExchangeRate =
          p.currency_code === 'TZS' ? 1 : Number(p.exchange_rate);
        this.syncPaymentDefaults(p);
        this.loadGovernance(id, p);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  private loadGovernance(poId: number, po: PurchaseOrder): void {
    this.procurement.getPOClosureChecklist(poId).subscribe({
      next: (c) => this.closureChecklist.set(c),
      error: () => this.closureChecklist.set(null),
    });
    this.procurement.getPaymentReleases({ purchase_order: poId }).subscribe({
      next: (r) => {
        this.paymentReleases.set(r.results);
        this.syncPaymentDefaults(po);
      },
      error: () => this.paymentReleases.set([]),
    });
    this.procurement.getSupplierInvoices({ purchase_order: poId, page_size: 50 }).subscribe({
      next: (r) =>
        this.supplierInvoices.set(
          r.results.filter((inv) => inv.purchase_order === poId || inv.po_id === poId),
        ),
      error: () => this.supplierInvoices.set([]),
    });
    this.procurement.getThreeWayMatches({ purchase_order: poId }).subscribe({
      next: (r) => this.threeWayMatches.set(r.results),
      error: () => this.threeWayMatches.set([]),
    });
    this.procurement.getGRNs({ purchase_order: poId, status: 'CONFIRMED' }).subscribe({
      next: (r) => this.grns.set(r.results),
      error: () => this.grns.set([]),
    });
  }

  paymentModeLabel(mode: PaymentMode): string {
    return this.paymentModes.find((m) => m.value === mode)?.label ?? mode;
  }

  defaultPaymentStage(mode: PaymentMode): PaymentReleaseStage {
    if (mode === 'PARTIAL') {
      const existing = this.paymentReleases().filter((release) => release.status !== 'REJECTED');
      return existing.some((r) => r.stage === 'ADVANCE') ? 'FINAL' : 'ADVANCE';
    }
    return 'FULL';
  }

  private syncPaymentDefaults(po: PurchaseOrder): void {
    this.paymentStage = this.defaultPaymentStage(po.payment_mode);
    this.paymentAmount = this.expectedAmountForStage(this.paymentStage, po);
  }

  expectedAmountForStage(
    stage: PaymentReleaseStage,
    po: PurchaseOrder | null = this.po(),
  ): number {
    if (!po) return 0;
    if (po.payment_mode === 'PARTIAL') {
      if (stage === 'ADVANCE') {
        return Number(
          po.expected_advance_amount ??
            (Number(po.total_amount) * Number(po.advance_percent ?? 0)) / 100,
        );
      }
      return Number(
        po.payment_remaining_amount ??
          po.expected_final_amount ??
          Number(po.total_amount) -
            (Number(po.total_amount) * Number(po.advance_percent ?? 0)) / 100,
      );
    }
    return Number(po.total_amount);
  }

  paymentPaidAmount(): number {
    return Number(this.po()?.payment_paid_amount ?? 0);
  }

  paymentRemainingAmount(): number {
    const po = this.po();
    return Number(po?.payment_remaining_amount ?? po?.total_amount ?? 0);
  }

  paymentProgressPercent(): number {
    return Number(this.po()?.payment_progress_percent ?? 0);
  }

  isReceivable(status: string): boolean {
    return ['APPROVED', 'SENT', 'PARTIAL', 'AWAITING_DELIVERY'].includes(status);
  }

  grnBaseRoute(): string {
    return this.inventoryContext() ? '/inventory/grn/new' : '/procurement/grn/new';
  }

  workflowIndex(status: string): number {
    const map: Record<string, number> = {
      DRAFT: 0,
      PENDING: 1,
      APPROVED: 2,
      SENT: 3,
      AWAITING_DELIVERY: 3,
      PARTIAL: 4,
      RECEIVED: 4,
      CLOSED: 5,
    };
    return map[status] ?? 0;
  }

  submitPo(): void {
    const p = this.po();
    if (!p) return;
    this.procurement.submitPurchaseOrder(p.id).subscribe({
      next: () => {
        this.notification.success('PO submitted for approval');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  hodApprove(): void {
    this.approvePo('HOD');
  }

  gmApprove(): void {
    this.approvePo('GM');
  }

  private approvePo(role: 'HOD' | 'GM'): void {
    const p = this.po();
    if (!p) return;
    this.procurement.approvePurchaseOrder(p.id, role).subscribe({
      next: () => {
        this.notification.success('PO approved');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  reject(): void {
    const p = this.po();
    if (!p) return;
    this.promptDialog.open({
      title: 'Reject Purchase Order',
      message: `Provide a reason for rejecting ${p.po_number}.`,
      label: 'Rejection reason',
      placeholder: 'Explain why this purchase order is being rejected',
      required: true,
      multiline: true,
      confirmLabel: 'Reject Purchase Order',
    }).subscribe((reason) => {
      if (!reason?.trim()) return;
      this.procurement.rejectPurchaseOrder(p.id, reason.trim()).subscribe({
        next: () => {
          this.notification.success('PO rejected');
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
    });
  }

  send(): void {
    const p = this.po()!;
    this.procurement.sendPurchaseOrder(p.id).subscribe({
      next: (res) => {
        this.notification.success(res.message || 'PO sent — supplier has been emailed');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  closePo(): void {
    const p = this.po();
    if (!p) return;
    this.procurement.closePurchaseOrder(p.id).subscribe({
      next: () => {
        this.notification.success('Purchase order closed');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  allItemsReceived(): boolean {
    const p = this.po();
    if (!p || !p.items?.length) return false;
    return p.items.every(
      (item) => Number(item.quantity_received ?? 0) >= Number(item.quantity_ordered ?? 0),
    );
  }

  canMarkReceived(): boolean {
    const p = this.po();
    if (!p) return false;
    return (
      (p.status === 'PARTIAL' ||
        p.status === 'SENT' ||
        p.status === 'AWAITING_DELIVERY') &&
      this.allItemsReceived() &&
      this.canReceive()
    );
  }

  markReceived(): void {
    const p = this.po();
    if (!p) return;
    this.procurement.markPurchaseOrderReceived(p.id).subscribe({
      next: () => {
        this.notification.success('Purchase order marked as fully received');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  retroactiveEmergency(): void {
    const p = this.po();
    if (!p) return;
    this.promptDialog.open({
      title: 'Record Retroactive Emergency Approval',
      message: `Provide the required emergency justification for ${p.po_number}.`,
      label: 'Emergency justification',
      placeholder: 'Describe the emergency and why retroactive approval is required',
      required: true,
      multiline: true,
      confirmLabel: 'Record Approval',
    }).subscribe((justification) => {
      if (!justification?.trim()) return;
      this.procurement.emergencyRetroactiveApproval(p.id, justification.trim()).subscribe({
        next: () => {
          this.notification.success('Retroactive GM approval recorded');
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
    });
  }

  readonly closureHint = (mode: PaymentMode) => closureHintForPaymentMode(mode);

  supplierPaid(): boolean {
    const p = this.po();
    if (!p) return false;
    const releases = this.paymentReleases();
    const stages: PaymentReleaseStage[] =
      p.payment_mode === 'PARTIAL' ? ['ADVANCE', 'FINAL'] : ['FULL'];
    return stages.every((stage) => {
      const r = releases.find((x) => x.stage === stage);
      return !!r && (r.status === 'PAID' || r.status === 'RELEASED');
    });
  }

  payableInvoices(): SupplierInvoice[] {
    const p = this.po();
    if (!p) return [];
    const stage = this.paymentStage;
    return this.supplierInvoices().filter((inv) => {
      if (inv.status === 'PAID' || !inv.three_way_matched) return false;
      if (inv.is_proforma) {
        if (p.payment_mode === 'PREPAID' && stage === 'FULL') return true;
        if (p.payment_mode === 'PARTIAL' && stage === 'ADVANCE') return true;
        return false;
      }
      if (p.payment_mode === 'PREPAID') return false;
      if (p.payment_mode === 'PARTIAL' && stage === 'ADVANCE') return false;
      return true;
    });
  }

  paymentReadinessItems() {
    const p = this.po();
    if (!p) return [];
    return buildPaymentReadiness(
      p,
      this.grns(),
      this.supplierInvoices(),
      this.threeWayMatches(),
      this.paymentReleases(),
      this.paymentStage,
    );
  }

  paymentReady(): boolean {
    return paymentReadinessComplete(this.paymentReadinessItems());
  }

  onPaymentStageChange(): void {
    const p = this.po();
    if (!p) return;
    this.paymentInvoiceId = null;
    this.paymentAmount = this.expectedAmountForStage(this.paymentStage, p);
  }

  createPaymentRelease(): void {
    const p = this.po();
    if (!p) return;
    if (!this.paymentInvoiceId) {
      this.notification.error('Select a matched supplier invoice');
      return;
    }
    this.procurement
      .createPaymentRelease({
        purchase_order: p.id,
        stage: this.paymentStage,
        amount: this.paymentAmount,
        currency: this.paymentCurrency,
        exchange_rate_to_tzs: this.paymentCurrency !== 'TZS' ? this.paymentExchangeRate : null,
        supplier_invoice: this.paymentInvoiceId,
      })
      .subscribe({
        next: () => {
          this.notification.success('Payment request submitted — finance will review');
          this.showPaymentForm.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  paymentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING_FINANCE: 'Awaiting Finance HOD',
      PENDING_GM: 'Awaiting GM Approval',
      APPROVED: 'Approved — Awaiting Payment',
      PAID: 'Supplier Paid',
      RELEASED: 'Supplier Paid',
      REJECTED: 'Rejected',
    };
    return labels[status] ?? status;
  }

  performMatch(): void {
    const p = this.po();
    if (!p || !this.matchGrnId) {
      this.notification.error('Select a GRN');
      return;
    }
    this.procurement
      .createThreeWayMatch({
        purchase_order: p.id,
        grn: this.matchGrnId,
        invoice: this.matchInvoiceId,
        match_type: this.matchType,
      })
      .subscribe({
        next: (m) => {
          this.notification.success(`Match recorded: ${m.result}`);
          this.showMatchForm.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  printPo(): void {
    printDocument('po-print-area');
  }

  exportPdf(): void {
    const p = this.po();
    if (!p) return;
    this.exportingPdf.set(true);
    this.procurement
      .downloadPurchaseOrderPdf(p.id)
      .pipe(finalize(() => this.exportingPdf.set(false)))
      .subscribe({
        next: (blob) => downloadBlob(blob, `${p.po_number}.pdf`),
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to generate PDF')),
      });
  }

  fxVariance(): string | null {
    return this.closureChecklist()?.fx_variance_tzs ?? null;
  }
}
