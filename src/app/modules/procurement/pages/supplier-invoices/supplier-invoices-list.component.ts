import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Currency } from '../../../../core/models/inventory.model';
import {
  GoodsReceivedNote,
  PurchaseOrder,
  Supplier,
  SupplierInvoice,
} from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';
import { WORKFLOW_STEPS } from '../../constants/procurement.constants';
import { canManagePO } from '../../utils/procurement-permissions.util';

@Component({
  selector: 'app-supplier-invoices-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    ProcurementNavComponent,
    PaginationComponent,
    ModalComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
    WorkflowStepperComponent,
  ],
  templateUrl: './supplier-invoices-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierInvoicesListComponent implements OnInit {
  private readonly procurement = inject(ProcurementService);
  private readonly currencyService = inject(CurrencyService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly invoices = signal<SupplierInvoice[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly pos = signal<PurchaseOrder[]>([]);
  readonly grns = signal<GoodsReceivedNote[]>([]);
  readonly currencies = signal<Currency[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly selectedPoInvoices = signal<SupplierInvoice[]>([]);
  readonly showRecord = signal(false);
  readonly showView = signal(false);
  readonly viewing = signal<SupplierInvoice | null>(null);

  readonly invoiceSteps = WORKFLOW_STEPS.invoice;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly canRecord = () => canManagePO(this.auth);

  readonly recordForm = this.fb.group({
    invoice_number: ['', Validators.required],
    supplier: [null as number | null, Validators.required],
    purchase_order: [null as number | null, Validators.required],
    grn: [null as number | null],
    is_proforma: [false],
    invoice_date: ['', Validators.required],
    due_date: ['', Validators.required],
    currency: [null as number | null, Validators.required],
    exchange_rate: [1],
    subtotal: [0, Validators.required],
    tax_amount: [0],
    total_amount: [0, Validators.required],
    notes: [''],
  });

  invoiceDocumentFile: File | null = null;

  ngOnInit(): void {
    this.recordForm.controls.currency.valueChanges.subscribe((currencyId) => {
      if (this.selectedPo()) return;
      const currency = this.currencies().find((row) => row.id === currencyId);
      if (currency) {
        this.recordForm.controls.exchange_rate.setValue(
          currency.is_default || currency.code === 'TZS'
            ? 1
            : Number(currency.exchange_rate),
        );
      }
    });
    this.currencyService.getCurrencies().subscribe((c) => this.currencies.set(c));
    this.procurement.getSuppliers({ page_size: 100 }).subscribe((d) => this.suppliers.set(d.results));
    this.loadInvoiceLinkablePos();
    this.procurement.getGRNs({ status: 'CONFIRMED', page_size: 100 }).subscribe((d) => this.grns.set(d.results));
    this.recordForm.get('purchase_order')?.valueChanges.subscribe((poId) => this.onPoSelect(poId));
    this.load();
  }

  loadInvoiceLinkablePos(): void {
    this.procurement.getInvoiceLinkablePurchaseOrders().subscribe((list) => this.pos.set(list));
  }

  private defaultCurrencyId(): number | null {
    return this.currencyService.defaultCurrencyId(this.currencies());
  }

  recordCurrencyCode(): string {
    const po = this.selectedPo();
    if (po?.currency_code) return po.currency_code;
    const currencyId = this.recordForm.value.currency;
    return this.currencies().find((c) => c.id === currencyId)?.code ?? 'TZS';
  }

  load(): void {
    this.loading.set(true);
    this.procurement
      .getSupplierInvoices({ page: this.page(), page_size: 10 })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => { this.invoices.set(d.results); this.total.set(d.count); },
      });
  }

  isOverdue(inv: SupplierInvoice): boolean {
    return new Date(inv.due_date) < new Date() && inv.status !== 'PAID';
  }

  gmReviewLabel(status: SupplierInvoice['gm_review_status']): string {
    const labels: Record<SupplierInvoice['gm_review_status'], string> = {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
    };
    return labels[status] ?? status;
  }

  financeApprovalLabel(status?: SupplierInvoice['approval_status']): string {
    switch (status) {
      case 'PENDING_FINANCE_APPROVAL':
        return 'Pending Finance';
      case 'APPROVED':
        return 'Finance OK';
      case 'REJECTED':
        return 'Finance Rejected';
      default:
        return 'Not Submitted';
    }
  }

  submitForFinanceApproval(inv: SupplierInvoice): void {
    this.procurement.submitSupplierInvoiceForFinanceApproval(inv.id).subscribe({
      next: (res) => {
        this.notification.success(res.message);
        this.load();
        if (this.viewing()?.id === inv.id) this.viewing.set(res.data);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  openRecord(): void {
    this.loadInvoiceLinkablePos();
    this.invoiceDocumentFile = null;
    this.selectedPoInvoices.set([]);
    this.recordForm.reset({
      invoice_date: new Date().toISOString().slice(0, 10),
      currency: this.defaultCurrencyId(),
      exchange_rate: 1,
      is_proforma: false,
      grn: null,
    });
    this.showRecord.set(true);
  }

  selectedPo(): PurchaseOrder | undefined {
    const poId = this.recordForm.value.purchase_order;
    return this.pos().find((p) => p.id === poId);
  }

  allowProforma(): boolean {
    const mode = this.selectedPo()?.payment_mode;
    return mode === 'PREPAID' || mode === 'PARTIAL';
  }

  filteredGrns(): GoodsReceivedNote[] {
    const poId = this.recordForm.value.purchase_order;
    if (!poId) return [];
    return this.grns().filter((g) => g.purchase_order === poId || g.po_id === poId);
  }

  onProformaToggle(checked: boolean): void {
    this.recordForm.patchValue({ is_proforma: checked, grn: checked ? null : this.recordForm.value.grn });
    const grnCtrl = this.recordForm.get('grn');
    if (checked) {
      grnCtrl?.clearValidators();
    } else {
      grnCtrl?.setValidators(Validators.required);
    }
    grnCtrl?.updateValueAndValidity();
    this.applyInvoiceAmountDefaults();
  }

  /** True when the current entry is a PARTIAL advance proforma (invoice = advance % only). */
  isPartialAdvanceEntry(): boolean {
    return (
      this.selectedPo()?.payment_mode === 'PARTIAL' && !!this.recordForm.value.is_proforma
    );
  }

  /** True when this is the GRN-backed final invoice of a PARTIAL PO (advance already invoiced). */
  isPartialFinalEntry(): boolean {
    return (
      this.selectedPo()?.payment_mode === 'PARTIAL' &&
      !this.recordForm.value.is_proforma &&
      this.hasAdvanceProforma()
    );
  }

  hasAdvanceProforma(): boolean {
    return this.selectedPoInvoices().some((inv) => inv.is_proforma);
  }

  partialAdvancePercent(): number {
    return Number(this.selectedPo()?.advance_percent ?? 0);
  }

  partialFinalPercent(): number {
    return Math.round((100 - this.partialAdvancePercent()) * 100) / 100;
  }

  expectedInvoiceAmounts(): { subtotal: number; tax: number; total: number } | null {
    const po = this.selectedPo();
    if (!po) return null;
    const round2 = (value: number) => Math.round(value * 100) / 100;
    let ratio = 1;
    if (this.isPartialAdvanceEntry()) {
      ratio = Number(po.advance_percent ?? 0) / 100;
    } else if (this.isPartialFinalEntry()) {
      ratio = (100 - Number(po.advance_percent ?? 0)) / 100;
    }
    return {
      subtotal: round2(Number(po.subtotal) * ratio),
      tax: round2(Number(po.tax_amount) * ratio),
      total: round2(Number(po.total_amount) * ratio),
    };
  }

  private applyInvoiceAmountDefaults(): void {
    const amounts = this.expectedInvoiceAmounts();
    if (!amounts) return;
    this.recordForm.patchValue({
      subtotal: amounts.subtotal,
      tax_amount: amounts.tax,
      total_amount: amounts.total,
    });
  }

  onPoSelect(poId: number | null): void {
    if (!poId) return;
    const po = this.pos().find((p) => p.id === poId);
    if (!po) return;
    this.selectedPoInvoices.set([]);
    this.recordForm.patchValue({
      supplier: po.supplier_id ?? po.supplier,
      currency: po.currency_id ?? po.currency,
      exchange_rate: po.exchange_rate ?? 1,
      grn: null,
    });
    this.procurement.getSupplierInvoices({ purchase_order: poId, page_size: 50 }).subscribe({
      next: (r) => {
        this.selectedPoInvoices.set(
          r.results.filter((inv) => inv.purchase_order === poId || inv.po_id === poId),
        );
        this.applyProformaDefault(po);
      },
      error: () => {
        this.selectedPoInvoices.set([]);
        this.applyProformaDefault(po);
      },
    });
  }

  private applyProformaDefault(po: PurchaseOrder): void {
    // PARTIAL: suggest proforma only for the advance; once an advance proforma
    // exists, the final invoice must be recorded against the GRN.
    const suggestProforma =
      po.payment_mode === 'PREPAID' ||
      (po.payment_mode === 'PARTIAL' && !this.hasAdvanceProforma());
    this.recordForm.patchValue({ is_proforma: suggestProforma });
    this.onProformaToggle(suggestProforma);
  }

  private notifyMatchResult(inv: SupplierInvoice, message?: string): void {
    const details = inv.match_details;
    if (inv.three_way_matched) {
      const defaultMsg = inv.is_proforma
        ? 'Proforma invoice matched to PO'
        : '3-way match successful';
      this.notification.success(message ?? defaultMsg);
      return;
    }
    const issue = details?.issues?.[0] ?? message ?? 'Amounts do not match between PO, GRN, and invoice';
    this.notification.warning(issue);
  }

  saveInvoice(): void {
    const raw = this.recordForm.getRawValue();
    if (raw.is_proforma && !this.allowProforma()) {
      this.notification.error('Proforma invoices are only allowed for PREPAID or PARTIAL POs.');
      return;
    }
    if (!raw.is_proforma && !raw.grn) {
      this.notification.error('Select a GRN or mark as proforma invoice.');
      return;
    }
    if (this.recordForm.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    if (this.isPartialAdvanceEntry() || this.isPartialFinalEntry()) {
      const expected = this.expectedInvoiceAmounts();
      const entered = Number(raw.total_amount);
      const fullTotal = Number(this.selectedPo()?.total_amount ?? 0);
      if (expected && expected.total > 0) {
        const diffPct = Math.abs(entered - expected.total) / expected.total;
        const matchesFull =
          this.isPartialFinalEntry() &&
          fullTotal > 0 &&
          Math.abs(entered - fullTotal) / fullTotal <= 0.01;
        if (diffPct > 0.01 && !matchesFull) {
          const label = this.isPartialAdvanceEntry()
            ? `a ${this.partialAdvancePercent()}% advance proforma`
            : `the final invoice (remaining ${this.partialFinalPercent()}%)`;
          this.notification.error(
            `This is ${label} — the total must be ` +
              `${formatCurrency(expected.total, this.recordCurrencyCode())}.`,
          );
          return;
        }
      }
    }
    this.saving.set(true);
    this.procurement
      .createSupplierInvoice({
        invoice_number: raw.invoice_number!,
        supplier: raw.supplier!,
        purchase_order: raw.purchase_order!,
        grn: raw.is_proforma ? null : raw.grn,
        is_proforma: !!raw.is_proforma,
        invoice_date: raw.invoice_date!,
        due_date: raw.due_date!,
        currency: raw.currency!,
        exchange_rate: Number(raw.exchange_rate),
        subtotal: Number(raw.subtotal),
        tax_amount: Number(raw.tax_amount),
        total_amount: Number(raw.total_amount),
        notes: raw.notes ?? '',
        invoice_document: this.invoiceDocumentFile,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (res) => {
          this.showRecord.set(false);
          this.load();
          this.notifyMatchResult(res.data, res.message);
          if (!res.data.three_way_matched) {
            this.viewing.set(res.data);
            this.showView.set(true);
          }
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  viewInvoice(inv: SupplierInvoice): void {
    this.procurement.getSupplierInvoice(inv.id).subscribe({
      next: (full) => { this.viewing.set(full); this.showView.set(true); },
    });
  }

  matchInvoice(inv: SupplierInvoice): void {
    this.procurement.matchInvoice(inv.id).subscribe({
      next: (res) => {
        this.notifyMatchResult(res.data, res.message);
        this.load();
        if (this.viewing()?.id === inv.id) this.viewing.set(res.data);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  onInvoiceDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.invoiceDocumentFile = input.files?.[0] ?? null;
  }
}
