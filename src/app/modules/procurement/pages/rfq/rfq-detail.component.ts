import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  Incoterm,
  PaymentMode,
  PaymentTerms,
  PurchaseOrder,
  ResponseCurrency,
  RFQ,
  RFQComparisonRow,
  RFQItemAward,
  RFQItemRecommendation,
  RFQSupplierInvite,
  SupplierResponse,
  SupplierResponseFormData,
} from '../../../../core/models/procurement.model';
import { Currency } from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { PromptDialogService } from '../../../../core/services/prompt-dialog.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';
import { PAYMENT_MODES, PAYMENT_TERMS, WORKFLOW_STEPS } from '../../constants/procurement.constants';
import {
  canAddRFQResponse,
  canGmOverrideRFQ,
  canManageRFQ,
  canRecommendRFQItems,
  canSelectRFQWinner,
  canAwardRFQItems,
} from '../../utils/procurement-permissions.util';

type RfqTab = 'details' | 'invited' | 'responses' | 'comparison' | 'purchase-order';
type QuotationPreviewKind = 'pdf' | 'image' | 'unsupported';

@Component({
  selector: 'app-rfq-detail',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    ProcurementNavComponent,
    WorkflowStepperComponent,
    StatusBadgeComponent,
    ModalComponent,
    DecimalPipe,
  ],
  templateUrl: './rfq-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RfqDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly procurement = inject(ProcurementService);
  private readonly notification = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly promptDialog = inject(PromptDialogService);
  private readonly currencyService = inject(CurrencyService);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);

  readonly rfq = signal<RFQ | null>(null);
  readonly responses = signal<SupplierResponse[]>([]);
  readonly comparison = signal<RFQComparisonRow[]>([]);
  readonly itemAwards = signal<RFQItemAward[]>([]);
  readonly itemRecommendations = signal<RFQItemRecommendation[]>([]);
  readonly linkedPos = signal<PurchaseOrder[]>([]);
  readonly linkedPo = signal<PurchaseOrder | null>(null);
  readonly activeTab = signal<RfqTab>('details');
  readonly showResponseModal = signal(false);
  readonly saving = signal(false);
  readonly savingAwards = signal(false);
  readonly savingRecommendations = signal(false);
  readonly recommendationsDirty = signal(false);
  readonly sendingEmails = signal(false);
  readonly editingResponse = signal<SupplierResponse | null>(null);
  readonly selectedInvite = signal<RFQSupplierInvite | null>(null);
  readonly selectedFileName = signal<string | null>(null);
  readonly filePreviewUrl = signal<string | null>(null);
  readonly existingFileName = signal<string | null>(null);
  readonly openingFile = signal(false);
  readonly showFilePreviewModal = signal(false);
  readonly previewModalTitle = signal('');
  readonly previewModalKind = signal<QuotationPreviewKind>('unsupported');
  readonly safePreviewUrl = signal<SafeResourceUrl | null>(null);
  readonly previewDownload = signal<{ blob: Blob; filename: string } | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly foreignCurrency = signal(false);
  readonly estimatedTzs = signal<number | null>(null);
  readonly masterCurrencies = signal<Currency[]>([]);

  readonly rfqSteps = WORKFLOW_STEPS.rfq;
  readonly formatDate = formatDate;
  readonly formatCurrency = formatCurrency;

  readonly tabs: { id: RfqTab; label: string }[] = [
    { id: 'details', label: 'RFQ Details' },
    { id: 'invited', label: 'Invited Suppliers' },
    { id: 'responses', label: 'Supplier Responses' },
    { id: 'comparison', label: 'Comparison' },
    { id: 'purchase-order', label: 'Purchase Order' },
  ];

  readonly currencies: ResponseCurrency[] = ['TZS', 'USD', 'CNY', 'EUR', 'AED', 'INR'];
  readonly incoterms: Incoterm[] = ['EXW', 'FOB', 'CIF', 'DDP'];
  readonly paymentTerms = PAYMENT_TERMS;
  readonly paymentModes = PAYMENT_MODES;
  readonly incotermLabels: Record<Incoterm, string> = {
    EXW: 'Ex Works',
    FOB: 'Free on Board',
    CIF: 'Cost, Insurance & Freight',
    DDP: 'Delivered Duty Paid',
  };
  readonly maxFileBytes = 5 * 1024 * 1024;
  readonly allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.docx'];

  readonly responseForm = this.fb.group({
    invited_supplier_id: [null as number | null, Validators.required],
    quoted_amount: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    currency: ['TZS' as ResponseCurrency, Validators.required],
    exchange_rate_to_tzs: [null as number | null],
    delivery_days: [null as number | null, [Validators.required, Validators.min(1)]],
    incoterm: ['' as Incoterm | ''],
    port_of_origin: [''],
    quotation_date: ['', Validators.required],
    payment_terms: ['NET_30' as PaymentTerms | 'CUSTOM', Validators.required],
    custom_payment_term_days: [
      null as number | null,
      [Validators.min(1), Validators.max(365)],
    ],
    payment_mode: ['POSTPAID' as PaymentMode, Validators.required],
    advance_percent: [null as number | null, [Validators.min(0), Validators.max(100)]],
    warranty: [''],
    notes: [''],
  });

  showResponseAdvancePercent(): boolean {
    return this.responseForm.controls.payment_mode.value === 'PARTIAL';
  }

  showCustomResponsePaymentTerms(): boolean {
    return this.responseForm.controls.payment_terms.value === 'CUSTOM';
  }

  private resolvedResponsePaymentTerms(): PaymentTerms | null {
    const selected = this.responseForm.controls.payment_terms.value;
    if (selected !== 'CUSTOM') return selected || null;
    const days = Number(this.responseForm.controls.custom_payment_term_days.value);
    return Number.isInteger(days) && days >= 1 && days <= 365 ? `NET_${days}` : null;
  }

  paymentTermLabel(value: PaymentTerms | string): string {
    const standard = this.paymentTerms.find((term) => term.value === value)?.label;
    if (standard) return standard;
    const custom = /^NET_(\d{1,3})$/.exec(value);
    return custom ? `Net ${Number(custom[1])}` : value;
  }

  paymentModeLabel(value: PaymentMode | string): string {
    return this.paymentModes.find((mode) => mode.value === value)?.label ?? value;
  }

  paymentSummary(
    terms: PaymentTerms | string,
    mode: PaymentMode | string,
    advancePercent?: number | string,
  ): string {
    const advance =
      mode === 'PARTIAL' && Number(advancePercent || 0) > 0
        ? ` (${Number(advancePercent)}% advance)`
        : '';
    return `${this.paymentTermLabel(terms)} · ${this.paymentModeLabel(mode)}${advance}`;
  }

  readonly canAddResponse = () => canAddRFQResponse(this.auth);
  readonly canSelect = () => canSelectRFQWinner(this.auth);
  readonly canAwardItems = () => canAwardRFQItems(this.auth);
  readonly canGmOverride = () => canGmOverrideRFQ(this.auth);
  readonly canRecommend = () => canRecommendRFQItems(this.auth);
  readonly canManage = () => canManageRFQ(this.auth);

  private rfqId = 0;
  private previewBlobUrl: string | null = null;
  private readonly itemAwardDraft = signal<Record<number, number | null>>({});
  private readonly itemRecommendationDraft = signal<Record<number, number | null>>({});
  private responseLinePrices: Record<number, number | null> = {};
  private responseLineVat: Record<number, boolean> = {};

  ngOnInit(): void {
    this.rfqId = +this.route.snapshot.paramMap.get('id')!;
    this.setupResponseFormListeners();
    this.currencyService.getCurrencies().subscribe({
      next: (currencies) => this.masterCurrencies.set(currencies),
      error: (error) => this.notification.error(getApiErrorMessage(error)),
    });
    this.loadRfq();
    this.loadResponses();
    this.loadComparison();
    this.loadItemAwards();
    this.loadItemRecommendations();
    this.loadLinkedPo();
  }

  ngOnDestroy(): void {
    this.revokeFilePreview();
    this.closeInAppPreview(false);
  }

  private setupResponseFormListeners(): void {
    this.responseForm.controls.currency.valueChanges.subscribe((currency) => {
      this.foreignCurrency.set(currency !== 'TZS');
      this.updateExchangeValidators(currency);
      if (!this.editingResponse()) {
        const master = this.masterCurrencies().find((row) => row.code === currency);
        this.responseForm.controls.exchange_rate_to_tzs.setValue(
          currency === 'TZS' ? null : master ? Number(master.exchange_rate) : null,
          { emitEvent: false },
        );
      }
      this.refreshEstimatedTzs();
    });
    this.responseForm.controls.quoted_amount.valueChanges.subscribe(() => this.refreshEstimatedTzs());
    this.responseForm.controls.exchange_rate_to_tzs.valueChanges.subscribe(() => this.refreshEstimatedTzs());
  }

  private updateExchangeValidators(currency: ResponseCurrency | null): void {
    const ctrl = this.responseForm.controls.exchange_rate_to_tzs;
    if (currency && currency !== 'TZS') {
      ctrl.setValidators([Validators.required, Validators.min(0.0001)]);
    } else {
      ctrl.clearValidators();
      ctrl.setValue(null);
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private updateIncotermValidators(international: boolean): void {
    const ctrl = this.responseForm.controls.incoterm;
    if (international) {
      ctrl.setValidators([Validators.required]);
    } else {
      ctrl.clearValidators();
      ctrl.setValue('');
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private refreshEstimatedTzs(): void {
    const raw = this.responseForm.getRawValue();
    const quotedTotal = this.isMultiItemRfq() ? this.lineItemsQuotedTotal() : raw.quoted_amount;
    if (!quotedTotal || quotedTotal <= 0) {
      this.estimatedTzs.set(null);
      return;
    }
    if (raw.currency === 'TZS') {
      this.estimatedTzs.set(quotedTotal);
      return;
    }
    if (!raw.exchange_rate_to_tzs || raw.exchange_rate_to_tzs <= 0) {
      this.estimatedTzs.set(null);
      return;
    }
    this.estimatedTzs.set(quotedTotal * raw.exchange_rate_to_tzs);
  }

  private configurePricingValidators(): void {
    const quotedCtrl = this.responseForm.controls.quoted_amount;
    if (this.isMultiItemRfq()) {
      quotedCtrl.clearValidators();
      quotedCtrl.setValue(null);
    } else {
      quotedCtrl.setValidators([Validators.required, Validators.min(0.0001)]);
    }
    quotedCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private initResponseLinePrices(existing?: SupplierResponse | null): void {
    const draft: Record<number, number | null> = {};
    const vatDraft: Record<number, boolean> = {};
    for (const item of this.rfq()?.items ?? []) {
      if (!item.id) continue;
      const existingLine = existing?.line_items?.find((line) => line.pr_item_id === item.id);
      draft[item.id] = existingLine ? Number(existingLine.unit_price) : null;
      if (existingLine) {
        vatDraft[item.id] = Number(existingLine.tax_rate ?? 0) > 0;
      } else {
        vatDraft[item.id] = Number(item.tax_rate ?? 0) > 0;
      }
    }
    this.responseLinePrices = draft;
    this.responseLineVat = vatDraft;
    this.refreshEstimatedTzs();
  }

  responseLineUnitPrice(prItemId: number): number | null {
    return this.responseLinePrices[prItemId] ?? null;
  }

  setResponseLineUnitPrice(prItemId: number, value: string): void {
    this.responseLinePrices[prItemId] = value ? Number(value) : null;
    this.refreshEstimatedTzs();
  }

  responseLineVatEnabled(prItemId: number): boolean {
    return this.responseLineVat[prItemId] === true;
  }

  setResponseLineVat(prItemId: number, enabled: boolean): void {
    this.responseLineVat[prItemId] = enabled;
    this.refreshEstimatedTzs();
  }

  responseLineTaxRate(prItemId: number): number {
    return this.responseLineVatEnabled(prItemId) ? 18 : 0;
  }

  lineEstUnit(item: { unit_cost_estimate?: number }): number {
    return Number(item.unit_cost_estimate ?? 0);
  }

  lineEstCost(item: { quantity_requested: number | string; unit_cost_estimate?: number }): number {
    return Number(item.quantity_requested ?? 0) * this.lineEstUnit(item);
  }

  lineEstVat(item: {
    quantity_requested: number | string;
    unit_cost_estimate?: number;
    tax_rate?: number;
  }): number {
    return this.lineEstCost(item) * (Number(item.tax_rate ?? 0) / 100);
  }

  lineEstTotal(item: {
    quantity_requested: number | string;
    unit_cost_estimate?: number;
    tax_rate?: number;
    total_estimate?: number;
  }): number {
    if (item.total_estimate != null && item.total_estimate !== undefined) {
      return Number(item.total_estimate);
    }
    return this.lineEstCost(item) + this.lineEstVat(item);
  }

  responseLineNet(prItemId: number): number | null {
    const item = this.rfq()?.items.find((row) => row.id === prItemId);
    const unitPrice = this.responseLinePrices[prItemId];
    if (!item || unitPrice == null || unitPrice <= 0) return null;
    return unitPrice * Number(item.quantity_requested);
  }

  responseLineVatAmount(prItemId: number): number | null {
    const net = this.responseLineNet(prItemId);
    if (net == null) return null;
    return net * (this.responseLineTaxRate(prItemId) / 100);
  }

  responseLineTotal(prItemId: number): number | null {
    const net = this.responseLineNet(prItemId);
    if (net == null) return null;
    return net + (this.responseLineVatAmount(prItemId) ?? 0);
  }

  lineItemsQuotedTotal(): number {
    return (this.rfq()?.items ?? []).reduce((sum, item) => {
      if (!item.id) return sum;
      const lineTotal = this.responseLineTotal(item.id);
      return sum + (lineTotal ?? 0);
    }, 0);
  }

  lineItemsQuotedVat(): number {
    return (this.rfq()?.items ?? []).reduce((sum, item) => {
      if (!item.id) return sum;
      return sum + (this.responseLineVatAmount(item.id) ?? 0);
    }, 0);
  }

  lineItemsQuotedNet(): number {
    return (this.rfq()?.items ?? []).reduce((sum, item) => {
      if (!item.id) return sum;
      return sum + (this.responseLineNet(item.id) ?? 0);
    }, 0);
  }

  hasCompleteLinePricing(): boolean {
    const items = this.rfq()?.items ?? [];
    if (!items.length) return false;
    return items.every((item) => {
      if (!item.id) return false;
      const price = this.responseLinePrices[item.id];
      return price != null && price > 0;
    });
  }

  private buildLineItemsPayload(): { pr_item_id: number; unit_price: number; tax_rate: number }[] {
    return (this.rfq()?.items ?? [])
      .filter((item) => item.id && this.responseLinePrices[item.id] != null)
      .map((item) => ({
        pr_item_id: item.id!,
        unit_price: this.responseLinePrices[item.id!]!,
        tax_rate: this.responseLineTaxRate(item.id!),
      }));
  }

  private resetResponseModalState(): void {
    this.revokeFilePreview();
    this.selectedFile = null;
    this.selectedFileName.set(null);
    this.existingFileName.set(null);
    this.fileError.set(null);
    this.estimatedTzs.set(null);
    this.foreignCurrency.set(false);
    this.responseLinePrices = {};
    this.responseLineVat = {};
  }

  private revokeFilePreview(): void {
    const url = this.filePreviewUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.filePreviewUrl.set(null);
    }
  }

  closeResponseModal(): void {
    this.showResponseModal.set(false);
    this.editingResponse.set(null);
    this.resetResponseModalState();
  }

  fieldInvalid(controlName: keyof typeof this.responseForm.controls): boolean {
    const ctrl = this.responseForm.controls[controlName];
    return ctrl.invalid && ctrl.touched;
  }

  fieldError(controlName: keyof typeof this.responseForm.controls): string {
    const ctrl = this.responseForm.controls[controlName];
    if (!ctrl.touched || !ctrl.errors) return '';
    if (ctrl.errors['required']) return 'This field is required.';
    if (ctrl.errors['min']) return 'Enter a value greater than zero.';
    return 'Invalid value.';
  }

  setTab(tab: RfqTab): void {
    this.activeTab.set(tab);
    if (tab === 'responses') {
      this.loadRfq();
      this.loadResponses();
      this.loadItemAwards();
      this.loadItemRecommendations();
      this.loadLinkedPo();
    }
    if (tab === 'comparison') this.loadComparison();
    if (tab === 'purchase-order') this.loadLinkedPo();
  }

  workflowIndex(rfq: RFQ): number {
    if (rfq.status === 'DRAFT') return 0;
    if (rfq.status === 'CLOSED') return 3;
    if (rfq.status === 'CANCELLED') return 0;
    if (rfq.status === 'OPEN') {
      if (this.respondedCount() === 0) return 1;
      return 2;
    }
    return 1;
  }

  totalInvited(): number {
    return this.rfq()?.invited_suppliers.length ?? 0;
  }

  respondedCount(): number {
    return this.responses().length;
  }

  pendingCount(): number {
    return this.inviteesWithoutResponse().length;
  }

  respondedRows(): { invite: RFQSupplierInvite; response: SupplierResponse }[] {
    return this.responseRows().filter(
      (row): row is { invite: RFQSupplierInvite; response: SupplierResponse } =>
        !!row.response && this.hasInviteResponse(row.invite),
    );
  }

  private inviteeId(inv: RFQSupplierInvite): number {
    return Number(inv.id);
  }

  hasInviteResponse(inv: RFQSupplierInvite): boolean {
    if (inv.has_response || inv.response_id) return true;
    const id = this.inviteeId(inv);
    return this.responses().some((resp) => Number(resp.invited_supplier_id) === id);
  }

  canAcceptNewResponse(inv: RFQSupplierInvite): boolean {
    if (this.hasInviteResponse(inv)) return false;
    return (
      inv.response_status === 'INVITED' ||
      inv.response_status === 'NO_RESPONSE' ||
      inv.response_status === 'RESPONDED'
    );
  }

  canAddResponseForInvite(inv: RFQSupplierInvite): boolean {
    const rfq = this.rfq();
    if (!rfq || rfq.status !== 'OPEN') return false;
    if (!this.canAddResponse()) return false;
    return this.canAcceptNewResponse(inv);
  }

  isStaleInvite(inv: RFQSupplierInvite): boolean {
    if (this.hasInviteResponse(inv)) return false;
    return ['RESPONDED', 'UNDER_REVIEW', 'SELECTED', 'PO_GENERATED'].includes(inv.response_status);
  }

  loadRfq(): void {
    this.procurement.getRFQ(this.rfqId).subscribe({
      next: (r) => {
        this.rfq.set(r);
        this.syncItemAwardDraft();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  resendRfqEmails(): void {
    this.sendingEmails.set(true);
    this.procurement
      .sendRfqEmails(this.rfqId)
      .pipe(finalize(() => this.sendingEmails.set(false)))
      .subscribe({
        next: ({ message }) => {
          this.notification.success(message);
          this.loadRfq();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  sendToSuppliers(): void {
    const r = this.rfq();
    if (!r) return;
    const invites = r.invited_suppliers ?? [];
    if (!invites.length && !(r.suppliers_count > 0)) {
      this.notification.error('Add at least one supplier before sending.');
      return;
    }
    const lines = invites.map((s) => {
      const name = s.supplier_name || 'Supplier';
      const email = (s.supplier_email || '').trim() || 'no email';
      return `• ${name} — ${email}`;
    });
    const list = lines.length ? lines.join('\n') : '• (no suppliers listed)';
    this.confirm
      .open({
        title: 'Send RFQ to Suppliers',
        message:
          `Send ${r.rfq_number} to these suppliers?\n\n` +
          `${list}\n\n` +
          `This will email them and open the RFQ.`,
        confirmLabel: 'Send',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.sendingEmails.set(true);
        this.procurement
          .sendRfqEmails(this.rfqId)
          .pipe(finalize(() => this.sendingEmails.set(false)))
          .subscribe({
            next: ({ message }) => {
              this.notification.success(message);
              this.loadRfq();
            },
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
      });
  }

  goEditDraft(): void {
    void this.router.navigate(['/procurement/rfq'], { queryParams: { edit: this.rfqId } });
  }

  loadResponses(): void {
    this.procurement.getRFQResponses(this.rfqId).subscribe({
      next: (rows) => this.responses.set(rows),
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  loadComparison(): void {
    this.procurement.getRFQComparison(this.rfqId).subscribe({
      next: (data) => this.comparison.set(data.rows),
    });
  }

  loadItemAwards(): void {
    this.procurement.getRFQItemAwards(this.rfqId).subscribe({
      next: (data) => {
        this.itemAwards.set(data.awards);
        this.syncItemAwardDraft();
      },
    });
  }

  loadItemRecommendations(): void {
    this.procurement.getRFQItemRecommendations(this.rfqId).subscribe({
      next: (data) => {
        this.itemRecommendations.set(data.recommendations);
        this.syncItemRecommendationDraft();
        this.recommendationsDirty.set(false);
      },
    });
  }

  isMultiItemRfq(): boolean {
    return (this.rfq()?.items.length ?? 0) > 1;
  }

  private syncItemAwardDraft(): void {
    const draft: Record<number, number | null> = {};
    for (const item of this.rfq()?.items ?? []) {
      if (!item.id) continue;
      const award = this.itemAwards().find((a) => a.pr_item_id === item.id);
      draft[item.id] = award?.response_id ?? null;
    }
    this.itemAwardDraft.set(draft);
  }

  private syncItemRecommendationDraft(): void {
    const draft: Record<number, number | null> = {};
    for (const item of this.rfq()?.items ?? []) {
      if (!item.id) continue;
      const rec = this.itemRecommendations().find((r) => r.pr_item_id === item.id);
      draft[item.id] = rec?.response_id ?? null;
    }
    this.itemRecommendationDraft.set(draft);
  }

  itemAwardSelection(prItemId: number): number | null {
    return this.itemAwardDraft()[prItemId] ?? null;
  }

  setItemAward(prItemId: number, responseId: string): void {
    if (this.isItemPoLocked(prItemId)) {
      this.notification.error('This item already has a purchase order and cannot be reassigned.');
      return;
    }
    this.itemAwardDraft.update((current) => ({
      ...current,
      [prItemId]: responseId ? Number(responseId) : null,
    }));
  }

  itemRecommendationSelection(prItemId: number): number | null {
    return this.itemRecommendationDraft()[prItemId] ?? null;
  }

  setItemRecommendation(prItemId: number, responseId: string): void {
    this.itemRecommendationDraft.update((current) => ({
      ...current,
      [prItemId]: responseId ? Number(responseId) : null,
    }));
    this.recommendationsDirty.set(true);
  }

  gmRecommendationForItem(prItemId: number): RFQItemRecommendation | null {
    return this.itemRecommendations().find((r) => r.pr_item_id === prItemId) ?? null;
  }

  hasAnyItemAwards(): boolean {
    const draft = this.itemAwardDraft();
    return (this.rfq()?.items ?? []).some((item) => item.id && !!draft[item.id]);
  }

  hasAnyItemRecommendations(): boolean {
    const draft = this.itemRecommendationDraft();
    return (this.rfq()?.items ?? []).some((item) => item.id && !!draft[item.id]);
  }

  hasSavedGmRecommendations(): boolean {
    return this.itemRecommendations().length > 0;
  }

  recommendationsSaveLabel(): string {
    if (this.savingRecommendations()) return 'Saving…';
    if (this.hasSavedGmRecommendations() && !this.recommendationsDirty()) {
      return 'Recommendations Saved';
    }
    if (this.hasSavedGmRecommendations() && this.recommendationsDirty()) {
      return 'Update Recommendations';
    }
    return 'Save Recommendations';
  }

  canSaveRecommendations(): boolean {
    if (this.savingRecommendations()) return false;
    if (!this.hasAnyItemRecommendations()) return false;
    if (this.hasSavedGmRecommendations() && !this.recommendationsDirty()) return false;
    return true;
  }

  /** @deprecated Prefer hasAnyItemAwards for partial awarding. */
  hasCompleteItemAwards(): boolean {
    const items = this.rfq()?.items ?? [];
    if (!items.length) return false;
    const draft = this.itemAwardDraft();
    return items.every((item) => item.id && !!draft[item.id]);
  }

  saveItemAwards(): void {
    const items = this.rfq()?.items ?? [];
    const draft = this.itemAwardDraft();
    const awards = items
      .filter((item) => item.id && draft[item.id])
      .map((item) => ({
        pr_item_id: item.id!,
        response_id: draft[item.id!]!,
      }));

    if (!awards.length) {
      this.notification.error('Select a supplier for at least one item.');
      return;
    }

    this.savingAwards.set(true);
    this.procurement
      .saveRFQItemAwards(this.rfqId, { awards })
      .pipe(finalize(() => this.savingAwards.set(false)))
      .subscribe({
        next: (data) => {
          const remaining = (this.rfq()?.items.length ?? 0) - awards.length;
          this.notification.success(
            remaining > 0
              ? `Saved ${awards.length} item award(s). ${remaining} item(s) still unassigned.`
              : 'Item awards saved',
          );
          this.itemAwards.set(data.awards);
          this.syncItemAwardDraft();
          this.loadRfq();
          this.loadResponses();
          this.loadComparison();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  saveGmRecommendations(): void {
    const items = this.rfq()?.items ?? [];
    const draft = this.itemRecommendationDraft();
    const recommendations = items
      .filter((item) => item.id && draft[item.id])
      .map((item) => ({
        pr_item_id: item.id!,
        response_id: draft[item.id!]!,
        notes: '',
      }));

    if (!recommendations.length) {
      this.notification.error('Select a recommended supplier for at least one item.');
      return;
    }

    this.savingRecommendations.set(true);
    this.procurement
      .saveRFQItemRecommendations(this.rfqId, { recommendations })
      .pipe(finalize(() => this.savingRecommendations.set(false)))
      .subscribe({
        next: (data) => {
          this.notification.success('GM recommendations saved — procurement can apply them when awarding.');
          this.itemRecommendations.set(data.recommendations);
          this.syncItemRecommendationDraft();
          this.recommendationsDirty.set(false);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  applyGmRecommendations(): void {
    const recs = this.itemRecommendations();
    if (!recs.length) {
      this.notification.error('No GM recommendations to apply.');
      return;
    }
    this.confirm
      .open({
        title: 'Apply GM Recommendations',
        message:
          'Fill the award selections from GM recommendations? Items that already have a PO will stay locked. You can still change unlocked items before saving awards.',
        confirmLabel: 'Apply',
      })
      .subscribe((ok) => {
        if (!ok) return;
        const next: Record<number, number | null> = { ...this.itemAwardDraft() };
        let applied = 0;
        for (const rec of recs) {
          if (this.isItemPoLocked(rec.pr_item_id)) continue;
          next[rec.pr_item_id] = rec.response_id;
          applied += 1;
        }
        this.itemAwardDraft.set(next);
        if (!applied) {
          this.notification.error('All recommended items already have purchase orders.');
          return;
        }
        this.notification.success(
          `Award selections filled for ${applied} item(s). Review and Save Item Awards.`,
        );
      });
  }

  supplierQuoteForItem(
    response: SupplierResponse,
    prItemId: number,
  ): { unit_price: number; line_total: number; currency: string } | null {
    const line = (response.line_items ?? []).find((l) => l.pr_item_id === prItemId);
    if (!line) {
      return null;
    }
    const unit = Number(line.unit_price ?? 0);
    const total = Number(line.line_total ?? unit * Number(line.quantity_requested ?? 0));
    return { unit_price: unit, line_total: total, currency: response.currency };
  }

  awardOptionLabel(response: SupplierResponse, prItemId: number): string {
    const quote = this.supplierQuoteForItem(response, prItemId);
    if (!quote) {
      return `${response.supplier_name} (no item price)`;
    }
    return `${response.supplier_name} — unit ${this.formatCurrency(quote.unit_price, quote.currency)} · total ${this.formatCurrency(quote.line_total, quote.currency)}`;
  }

  awardedItemsForResponse(responseId: number): RFQItemAward[] {
    return this.itemAwards().filter((a) => a.response_id === responseId);
  }

  poForResponse(responseId: number): PurchaseOrder | null {
    return (
      this.linkedPos().find((po) => Number(po.supplier_response_id) === responseId) ?? null
    );
  }

  /** Item already covered by a generated (non-cancelled) PO — cannot reassign or re-PO. */
  isItemPoLocked(prItemId: number): boolean {
    const award = this.itemAwards().find((a) => a.pr_item_id === prItemId);
    if (!award) return false;
    return this.poForResponse(award.response_id) != null;
  }

  responseHasPo(response: SupplierResponse): boolean {
    return (
      response.response_status === 'PO_GENERATED' || this.poForResponse(response.id) != null
    );
  }

  viewPo(po: PurchaseOrder): void {
    void this.router.navigate(['/procurement/purchase-orders', po.id, 'view']);
  }

  viewPoForResponse(response: SupplierResponse): void {
    const po = this.poForResponse(response.id);
    if (!po) {
      this.notification.error('Purchase order not found for this supplier.');
      return;
    }
    this.viewPo(po);
  }

  loadLinkedPo(): void {
    const r = this.rfq();
    if (!r) {
      this.procurement.getRFQ(this.rfqId).subscribe({
        next: (rfq) => {
          this.rfq.set(rfq);
          this.fetchPo(rfq.requisition_id);
        },
      });
      return;
    }
    this.fetchPo(r.requisition_id);
  }

  private fetchPo(requisitionId: number): void {
    this.procurement.getPurchaseOrders({ requisition: requisitionId, page_size: 10 }).subscribe({
      next: (d) => {
        const active = d.results.filter((po) => po.status !== 'CANCELLED');
        this.linkedPos.set(active);
        this.linkedPo.set(active[0] ?? null);
      },
    });
  }

  inviteesWithoutResponse(): RFQSupplierInvite[] {
    const r = this.rfq();
    if (!r || r.status !== 'OPEN') return [];
    return r.invited_suppliers.filter((inv) => this.canAddResponseForInvite(inv));
  }

  responseRows(): { invite: RFQSupplierInvite; response: SupplierResponse | null }[] {
    const r = this.rfq();
    if (!r) return [];
    return r.invited_suppliers.map((invite) => ({
      invite,
      response:
        this.responses().find((resp) => Number(resp.invited_supplier_id) === this.inviteeId(invite)) ??
        null,
    }));
  }

  selectedWinner(): SupplierResponse | null {
    if (this.isMultiItemRfq()) return null;
    return this.responses().find((r) => r.response_status === 'SELECTED') ?? null;
  }

  selectedWinners(): SupplierResponse[] {
    if (this.isMultiItemRfq()) {
      return this.responses().filter(
        (r) => r.response_status === 'SELECTED' || r.response_status === 'PO_GENERATED',
      );
    }
    const winner = this.selectedWinner();
    return winner ? [winner] : [];
  }

  hasItemAwards(): boolean {
    return this.itemAwards().length > 0;
  }

  hasRespondedQuotations(): boolean {
    return this.responses().length > 0;
  }

  isInternationalInvite(): boolean {
    const invite = this.selectedInvite();
    return !!invite?.is_international;
  }

  showExchangeRate(): boolean {
    return this.foreignCurrency();
  }

  openAddResponse(invite: RFQSupplierInvite): void {
    this.editingResponse.set(null);
    this.selectedInvite.set(invite);
    this.resetResponseModalState();
    this.responseForm.reset({
      invited_supplier_id: invite.id,
      quoted_amount: null,
      currency: 'TZS',
      exchange_rate_to_tzs: null,
      delivery_days: null,
      incoterm: '',
      port_of_origin: '',
      quotation_date: new Date().toISOString().slice(0, 10),
      payment_terms: 'NET_30',
      custom_payment_term_days: null,
      payment_mode: 'POSTPAID',
      advance_percent: null,
      warranty: '',
      notes: '',
    });
    this.foreignCurrency.set(false);
    this.updateExchangeValidators('TZS');
    this.updateIncotermValidators(!!invite.is_international);
    this.configurePricingValidators();
    this.initResponseLinePrices();
    this.refreshEstimatedTzs();
    this.showResponseModal.set(true);
  }

  openEditResponse(response: SupplierResponse): void {
    this.editingResponse.set(response);
    const invite =
      this.rfq()?.invited_suppliers.find((i) => i.id === response.invited_supplier_id) ?? null;
    this.selectedInvite.set(invite);
    this.resetResponseModalState();
    if (response.quotation_file_name || response.quotation_file_url) {
      this.existingFileName.set(response.quotation_file_name || 'Attached quotation');
    }
    const responseTerms = response.payment_terms || 'NET_30';
    const standardTerms = this.paymentTerms.some((term) => term.value === responseTerms);
    const customDaysMatch = /^NET_(\d{1,3})$/.exec(responseTerms);
    this.responseForm.patchValue({
      invited_supplier_id: response.invited_supplier_id,
      quoted_amount: Number(response.quoted_amount),
      currency: response.currency,
      exchange_rate_to_tzs: response.exchange_rate_to_tzs,
      delivery_days: response.delivery_days,
      incoterm: response.incoterm || '',
      port_of_origin: response.port_of_origin,
      quotation_date: response.quotation_date,
      payment_terms: standardTerms ? responseTerms : 'CUSTOM',
      custom_payment_term_days:
        !standardTerms && customDaysMatch ? Number(customDaysMatch[1]) : null,
      payment_mode: response.payment_mode || 'POSTPAID',
      advance_percent: Number(response.advance_percent || 0) || null,
      warranty: response.warranty,
      notes: response.notes,
    });
    this.foreignCurrency.set(response.currency !== 'TZS');
    this.updateExchangeValidators(response.currency);
    this.updateIncotermValidators(!!invite?.is_international);
    this.configurePricingValidators();
    this.initResponseLinePrices(response);
    if (!this.isMultiItemRfq()) {
      this.responseForm.controls.quoted_amount.setValue(Number(response.quoted_amount));
    }
    this.refreshEstimatedTzs();
    this.showResponseModal.set(true);
  }

  selectedFile: File | null = null;

  triggerFileInput(input: HTMLInputElement): void {
    input.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fileError.set(null);

    if (!file) {
      this.revokeFilePreview();
      this.selectedFile = null;
      this.selectedFileName.set(null);
      return;
    }

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      this.fileError.set('Allowed types: PDF, JPG, PNG, DOCX.');
      this.revokeFilePreview();
      this.selectedFile = null;
      this.selectedFileName.set(null);
      input.value = '';
      return;
    }
    if (file.size > this.maxFileBytes) {
      this.fileError.set('File must not exceed 5 MB.');
      this.revokeFilePreview();
      this.selectedFile = null;
      this.selectedFileName.set(null);
      input.value = '';
      return;
    }

    this.revokeFilePreview();
    this.selectedFile = file;
    this.selectedFileName.set(`${file.name} (${this.formatFileSize(file.size)})`);
    this.filePreviewUrl.set(URL.createObjectURL(file));
  }

  previewSelectedFile(): void {
    if (this.selectedFile) {
      this.openInAppPreview(this.selectedFile, this.selectedFile.name);
      return;
    }
    const url = this.filePreviewUrl();
    if (!url) return;
    this.openInAppPreviewFromUrl(url, this.selectedFileName() || 'quotation');
  }

  hasExistingFile(): boolean {
    return !!this.editingResponse()?.quotation_file_url;
  }

  private previewKindForFilename(filename: string): QuotationPreviewKind {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    if (ext === '.pdf') return 'pdf';
    if (['.jpg', '.jpeg', '.png'].includes(ext)) return 'image';
    return 'unsupported';
  }

  private openInAppPreview(blob: Blob, filename: string): void {
    this.closeInAppPreview(false);
    const url = URL.createObjectURL(blob);
    this.previewBlobUrl = url;
    this.previewModalTitle.set(filename);
    this.previewModalKind.set(this.previewKindForFilename(filename));
    this.safePreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    this.previewDownload.set({ blob, filename });
    this.showFilePreviewModal.set(true);
  }

  private openInAppPreviewFromUrl(url: string, filename: string): void {
    this.closeInAppPreview(false);
    this.previewBlobUrl = url;
    this.previewModalTitle.set(filename);
    this.previewModalKind.set(this.previewKindForFilename(filename));
    this.safePreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    this.previewDownload.set(null);
    this.showFilePreviewModal.set(true);
  }

  closeInAppPreview(revoke = true): void {
    if (revoke && this.previewBlobUrl && this.previewBlobUrl !== this.filePreviewUrl()) {
      URL.revokeObjectURL(this.previewBlobUrl);
    }
    this.previewBlobUrl = null;
    this.safePreviewUrl.set(null);
    this.previewDownload.set(null);
    this.showFilePreviewModal.set(false);
    this.previewModalTitle.set('');
    this.previewModalKind.set('unsupported');
  }

  downloadPreviewFile(): void {
    const file = this.previewDownload();
    if (!file) return;
    const url = URL.createObjectURL(file.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  openQuotationFile(response: SupplierResponse, disposition: 'inline' | 'attachment'): void {
    if (!response.quotation_file_url && !response.quotation_file_view_url) return;
    this.openingFile.set(true);
    this.procurement
      .getQuotationFile(this.rfqId, response.id, disposition)
      .pipe(finalize(() => this.openingFile.set(false)))
      .subscribe({
        next: (blob) => {
          const filename = response.quotation_file_name || 'quotation';
          if (disposition === 'attachment') {
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            anchor.click();
            URL.revokeObjectURL(url);
            return;
          }
          this.openInAppPreview(blob, filename);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  previewExistingFile(): void {
    const response = this.editingResponse();
    if (!response) return;
    this.openQuotationFile(response, 'inline');
  }

  clearSelectedFile(input: HTMLInputElement): void {
    input.value = '';
    this.revokeFilePreview();
    this.selectedFile = null;
    this.selectedFileName.set(null);
    this.fileError.set(null);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  saveResponse(): void {
    this.updateIncotermValidators(this.isInternationalInvite());
    this.updateExchangeValidators(this.responseForm.controls.currency.value);
    this.configurePricingValidators();

    if (this.isMultiItemRfq() && !this.hasCompleteLinePricing()) {
      this.notification.error('Enter a unit price for every item.');
      return;
    }

    if (this.responseForm.invalid) {
      this.responseForm.markAllAsTouched();
      this.notification.error('Please complete all required fields.');
      return;
    }
    if (this.fileError()) return;
    const raw = this.responseForm.getRawValue();
    const resolvedPaymentTerms = this.resolvedResponsePaymentTerms();
    if (!resolvedPaymentTerms) {
      this.notification.error('Enter custom net days between 1 and 365.');
      return;
    }
    const quotedAmount = this.isMultiItemRfq() ? this.lineItemsQuotedTotal() : raw.quoted_amount!;
    const payload: SupplierResponseFormData = {
      invited_supplier_id: raw.invited_supplier_id!,
      quoted_amount: quotedAmount,
      currency: raw.currency!,
      exchange_rate_to_tzs: raw.currency === 'TZS' ? null : raw.exchange_rate_to_tzs,
      delivery_days: raw.delivery_days!,
      incoterm: (raw.incoterm || '') as Incoterm | '',
      port_of_origin: raw.port_of_origin || '',
      quotation_date: raw.quotation_date!,
      payment_terms: resolvedPaymentTerms,
      payment_mode: raw.payment_mode!,
      advance_percent:
        raw.payment_mode === 'PARTIAL' && raw.advance_percent != null
          ? Number(raw.advance_percent)
          : 0,
      warranty: raw.warranty || '',
      notes: raw.notes || '',
      quotation_file: this.selectedFile,
      line_items: this.isMultiItemRfq() ? this.buildLineItemsPayload() : undefined,
    };

    this.saving.set(true);
    const editing = this.editingResponse();
    const req$ = editing
      ? this.procurement.updateRFQResponse(this.rfqId, editing.id, payload)
      : this.procurement.createRFQResponse(this.rfqId, payload);

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notification.success(editing ? 'Response updated' : 'Response recorded');
        this.closeResponseModal();
        this.loadRfq();
        this.loadResponses();
        this.loadComparison();
        this.loadItemAwards();
        this.loadItemRecommendations();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  selectWinner(response: SupplierResponse): void {
    this.confirm
      .open({
        title: 'Select winning supplier',
        message: 'Other active responses will be automatically rejected.',
        confirmLabel: 'Select',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.procurement.selectRFQResponse(this.rfqId, response.id).subscribe({
          next: () => {
            this.notification.success('Winning supplier selected');
            this.loadRfq();
            this.loadResponses();
            this.loadComparison();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  rejectResponse(response: SupplierResponse): void {
    this.procurement.rejectRFQResponse(this.rfqId, response.id).subscribe({
      next: () => {
        this.notification.success('Response rejected');
        this.loadRfq();
        this.loadResponses();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  markUnderReview(response: SupplierResponse): void {
    this.procurement.reviewRFQResponse(this.rfqId, response.id).subscribe({
      next: () => {
        this.notification.success('Marked under review');
        this.loadRfq();
        this.loadResponses();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  generatePo(response: SupplierResponse): void {
    if (this.responseHasPo(response)) {
      this.notification.error('A purchase order already exists for this supplier.');
      this.viewPoForResponse(response);
      return;
    }
    this.confirm
      .open({
        title: 'Create Purchase Order',
        message: `Create a draft PO for ${response.supplier_name}? You cannot create another PO for the same awarded items afterward.`,
        confirmLabel: 'Create PO',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.procurement.generatePOFromResponse(this.rfqId, response.id).subscribe({
          next: (result) => {
            const po = result.purchase_order;
            this.notification.success(`Draft PO ${po.po_number} generated`);
            this.loadLinkedPo();
            this.loadRfq();
            this.loadResponses();
            this.loadItemAwards();
            void this.router.navigate(['/procurement/purchase-orders', po.id, 'view']);
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  gmOverride(response: SupplierResponse): void {
    this.promptDialog.open({
      title: 'Override Supplier Selection',
      message: 'Provide the reason for reversing this supplier selection and returning it to review.',
      label: 'Override reason',
      placeholder: 'Explain why this selection should be overridden',
      required: true,
      multiline: true,
      confirmLabel: 'Override Selection',
    }).subscribe((reason) => {
      if (!reason?.trim()) return;
      this.procurement.gmOverrideRFQResponse(this.rfqId, response.id, reason.trim()).subscribe({
        next: () => {
          this.notification.success('Selection reversed — under review');
          this.loadRfq();
          this.loadResponses();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
    });
  }

  countryFlag(country: string): string {
    if (!country) return '🌍';
    if (country.toLowerCase() === 'tanzania') return '🇹🇿';
    if (country.toLowerCase() === 'china') return '🇨🇳';
    return '🌍';
  }

  canActOnResponse(
    response: SupplierResponse,
    action: 'edit' | 'select' | 'reject' | 'review' | 'po' | 'override',
  ): boolean {
    const status = response.response_status;
    switch (action) {
      case 'edit':
        return (
          this.canAddResponse() &&
          !response.is_locked &&
          ['RESPONDED', 'UNDER_REVIEW'].includes(status)
        );
      case 'select':
        return this.canSelect() && !this.isMultiItemRfq() && ['RESPONDED', 'UNDER_REVIEW'].includes(status);
      case 'review':
        return this.canSelect() && status === 'RESPONDED';
      case 'reject':
        return this.canSelect() && ['RESPONDED', 'UNDER_REVIEW'].includes(status);
      case 'po':
        if (!this.canSelect() && !this.canAwardItems()) return false;
        if (this.responseHasPo(response)) return false;
        if (status !== 'SELECTED') return false;
        if (this.isMultiItemRfq()) {
          return this.awardedItemsForResponse(response.id).length > 0;
        }
        return true;
      case 'override':
        return this.canGmOverride() && status === 'SELECTED';
      default:
        return false;
    }
  }
}
