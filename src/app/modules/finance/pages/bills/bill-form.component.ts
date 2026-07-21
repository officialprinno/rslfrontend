import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { Currency } from '../../../../core/models/inventory.model';
import {
  Account,
  Bill,
  BillFormData,
  BillLineFormData,
  FinanceCustomer,
  FinanceVendor,
  TaxSetting,
} from '../../../../core/models/finance.model';
import { PaginatedData } from '../../../../core/models/paginated.model';
import { CurrencyService } from '../../../../core/services/currency.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  SearchableSelectComponent,
  SelectOption,
  SelectCategoryGroup,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { OpenFileComponent } from '../../../../shared/components/open-file/open-file.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import {
  BILL_PAYMENT_TERMS,
  BILL_TAX_LEVELS,
  BILL_TAX_TREATMENTS,
  formatAccountingAmount,
} from '../../constants/finance.constants';
import { NewCustomerModalComponent } from './new-customer-modal.component';
import { NewVendorModalComponent } from './new-vendor-modal.component';
import { buildChartOfAccountSelectGroups } from '../../utils/finance-account-options.util';

@Component({
  selector: 'app-bill-form',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    SearchableSelectComponent,
    OpenFileComponent,
    NewVendorModalComponent,
    NewCustomerModalComponent,
  ],
  templateUrl: './bill-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly finance = inject(FinanceService);
  private readonly currencyService = inject(CurrencyService);
  private readonly notification = inject(NotificationService);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly referenceDataLoaded = signal(false);
  readonly editId = signal<number | null>(null);
  readonly showVendorModal = signal(false);
  readonly showCustomerModal = signal(false);
  readonly customerModalLineIndex = signal<number | null>(null);
  readonly formRevision = signal(0);

  readonly vendors = signal<FinanceVendor[]>([]);
  readonly customers = signal<FinanceCustomer[]>([]);
  readonly accounts = signal<Account[]>([]);
  readonly currencies = signal<Currency[]>([]);
  readonly taxes = signal<TaxSetting[]>([]);

  paymentProofFile: File | null = null;
  paymentProofUrl: string | null = null;
  paymentProofName: string | null = null;

  readonly paymentTerms = BILL_PAYMENT_TERMS;
  readonly taxTreatments = BILL_TAX_TREATMENTS;
  readonly taxLevels = BILL_TAX_LEVELS;
  readonly formatAccountingAmount = formatAccountingAmount;

  form: BillFormData = this.emptyForm();

  readonly vendorOptions = computed<SelectOption[]>(() =>
    this.vendors().map((v) => ({ value: v.id, label: v.name })),
  );

  readonly customerOptions = computed<SelectOption[]>(() =>
    this.customers().map((c) => ({ value: c.id, label: c.name })),
  );

  readonly accountOptionGroups = computed<SelectCategoryGroup[]>(() =>
    buildChartOfAccountSelectGroups(
      this.accounts().filter((a) => a.account_type === 'EXPENSE' || a.account_type === 'ASSET'),
    ),
  );

  readonly apAccountGroups = computed<SelectCategoryGroup[]>(() =>
    buildChartOfAccountSelectGroups(this.accounts()),
  );

  readonly taxOptions = computed<SelectOption[]>(() =>
    this.taxes()
      .filter((t) => t.applicable_to === 'PURCHASE')
      .map((t) => ({ value: t.id, label: `${t.name} (${t.rate}%)` })),
  );

  readonly subtotal = computed(() => {
    this.formRevision();
    return this.form.lines.reduce((s, l) => s + this.lineAmount(l), 0);
  });

  readonly discountAmount = computed(() => {
    this.formRevision();
    const pct = (this.subtotal() * Number(this.form.discount_percent)) / 100;
    return Math.max(pct, Number(this.form.discount_amount));
  });

  readonly taxAmount = computed(() => {
    this.formRevision();
    const base = this.subtotal() - this.discountAmount() + Number(this.form.adjustment);
    if (base < 0) return 0;
    if (this.form.tax_level === 'TRANSACTION' && this.form.transaction_tax) {
      const rate = Number(this.taxes().find((t) => t.id === this.form.transaction_tax)?.rate ?? 0);
      return (base * rate) / 100;
    }
    if (this.form.tax_level === 'LINE') {
      return this.form.lines.reduce((s, l) => {
        const amt = this.lineAmount(l);
        const rate = Number(this.taxes().find((t) => t.id === l.tax)?.rate ?? 0);
        return s + (amt * rate) / 100;
      }, 0);
    }
    return 0;
  });

  readonly estimatedTotal = computed(() => {
    this.formRevision();
    const base = this.subtotal() - this.discountAmount() + Number(this.form.adjustment);
    if (this.form.tax_treatment === 'INCLUSIVE' && this.form.tax_level === 'TRANSACTION') {
      return Math.max(base, 0);
    }
    return Math.max(base + this.taxAmount(), 0);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({
      vendors: this.finance.getVendors({ page_size: 200 }),
      customers: this.finance.getCustomers({ page_size: 200 }),
      accounts: this.finance.getAccounts({ page_size: 500, is_active: true }),
      currencies: this.currencyService.getCurrencies(),
      taxes: this.finance.getTaxSettings(),
    }).subscribe(({ vendors, customers, accounts, currencies, taxes }) => {
      this.vendors.set(vendors.results);
      this.customers.set(customers.results);
      const accountList = Array.isArray(accounts)
        ? accounts
        : (accounts as PaginatedData<Account>).results;
      this.accounts.set(accountList);
      this.currencies.set(currencies);
      this.taxes.set(taxes);
      const tzs = currencies.find((c) => c.code === 'TZS');
      if (tzs && !this.form.currency) this.form.currency = tzs.id;

      this.ensureLineAccounts();
      if (!id && !this.form.lines.length) {
        this.addLine();
      }
      this.referenceDataLoaded.set(true);
    });

    if (id) {
      this.editId.set(+id);
      this.loading.set(true);
      this.finance
        .getBill(+id)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (bill) => {
            if (bill.status !== 'DRAFT') {
              this.notification.error('Only draft bills can be edited.');
              void this.router.navigate(['/finance/bills', bill.id, 'view']);
              return;
            }
            this.form = {
              vendor_bill_number: bill.vendor_bill_number,
              vendor: bill.vendor,
              order_number: bill.order_number,
              bill_date: bill.bill_date,
              due_date: bill.due_date ?? '',
              payment_terms: bill.payment_terms,
              accounts_payable: bill.accounts_payable,
              subject: bill.subject,
              currency: bill.currency,
              tax_treatment: bill.tax_treatment,
              tax_level: bill.tax_level,
              transaction_tax: bill.transaction_tax,
              discount_percent: Number(bill.discount_percent),
              discount_amount: Number(bill.discount_amount),
              adjustment: Number(bill.adjustment),
              notes: bill.notes,
              lines: bill.lines.map((l) => ({
                item: l.item ?? null,
                description: l.description,
                account: l.account,
                quantity: Number(l.quantity),
                rate: Number(l.rate),
                tax: l.tax ?? null,
                customer: l.customer ?? null,
              })),
              save_as: 'draft',
            };
            this.paymentProofUrl = bill.payment_proof_url ?? null;
            this.paymentProofName = bill.payment_proof_name ?? null;
            this.ensureLineAccounts();
            this.bumpForm();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
    }
  }

  defaultExpenseAccountId(): number | null {
    const expense = this.accounts().find((a) => a.account_type === 'EXPENSE');
    if (expense) return expense.id;
    const fallback = this.accounts().find(
      (a) => a.account_type === 'EXPENSE' || a.account_type === 'ASSET',
    );
    return fallback?.id ?? null;
  }

  lineHasValidAccount(line: BillLineFormData): boolean {
    return Number(line.account) > 0;
  }

  ensureLineAccounts(): void {
    const defaultAccount = this.defaultExpenseAccountId();
    if (!defaultAccount) return;
    let changed = false;
    for (const line of this.form.lines) {
      if (!this.lineHasValidAccount(line)) {
        line.account = defaultAccount;
        changed = true;
      }
    }
    if (changed) {
      this.bumpForm();
    }
  }

  onLineAccountChange(line: BillLineFormData, value: number | string | null): void {
    if (value === null || value === '' || Number(value) <= 0) {
      return;
    }
    line.account = Number(value);
    this.bumpForm();
  }

  currencyCode(): string {
    return this.currencies().find((c) => c.id === this.form.currency)?.code ?? 'TZS';
  }

  emptyForm(): BillFormData {
    return {
      vendor_bill_number: '',
      vendor: 0,
      order_number: '',
      bill_date: new Date().toISOString().slice(0, 10),
      due_date: '',
      payment_terms: 'DUE_ON_RECEIPT',
      accounts_payable: null,
      subject: '',
      currency: 0,
      tax_treatment: 'EXCLUSIVE',
      tax_level: 'TRANSACTION',
      transaction_tax: null,
      discount_percent: 0,
      discount_amount: 0,
      adjustment: 0,
      notes: '',
      lines: [],
      save_as: 'draft',
    };
  }

  bumpForm(): void {
    this.formRevision.update((n) => n + 1);
  }

  lineAmount(line: BillLineFormData): number {
    return Number(line.quantity || 0) * Number(line.rate || 0);
  }

  addLine(): void {
    this.form.lines.push({
      description: '',
      account: this.defaultExpenseAccountId() ?? 0,
      quantity: 1,
      rate: 0,
      tax: null,
      customer: null,
    });
    this.ensureLineAccounts();
    this.bumpForm();
  }

  removeLine(index: number): void {
    this.form.lines.splice(index, 1);
    this.bumpForm();
  }

  onPaymentProofSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.paymentProofFile = file;
    this.paymentProofName = file.name;
    this.paymentProofUrl = null;
    this.bumpForm();
  }

  clearPaymentProof(): void {
    this.paymentProofFile = null;
    this.paymentProofUrl = null;
    this.paymentProofName = null;
    this.bumpForm();
  }

  openCustomerModal(lineIndex: number): void {
    this.customerModalLineIndex.set(lineIndex);
    this.showCustomerModal.set(true);
  }

  onVendorCreated(vendor: FinanceVendor, _reused?: boolean): void {
    if (!this.vendors().some((v) => v.id === vendor.id)) {
      this.vendors.update((list) => [vendor, ...list]);
    }
    this.form.vendor = vendor.id;
    const termsMap: Record<string, BillFormData['payment_terms']> = {
      DUE_ON_RECEIPT: 'DUE_ON_RECEIPT',
      NET_15: 'NET_15',
      NET_30: 'NET_30',
      NET_60: 'NET_60',
    };
    this.form.payment_terms = termsMap[vendor.payment_terms] ?? 'NET_30';
    this.form.currency = vendor.currency;
    this.showVendorModal.set(false);
  }

  onCustomerCreated(customer: FinanceCustomer, _reused?: boolean): void {
    if (!this.customers().some((c) => c.id === customer.id)) {
      this.customers.update((list) => [customer, ...list]);
    }
    const idx = this.customerModalLineIndex();
    if (idx !== null) {
      this.form.lines[idx].customer = customer.id;
    }
    this.showCustomerModal.set(false);
    this.customerModalLineIndex.set(null);
    this.bumpForm();
  }

  private buildBillPayload(saveAs: 'draft' | 'open'): BillFormData {
    return {
      vendor_bill_number: this.form.vendor_bill_number,
      vendor: this.form.vendor,
      order_number: this.form.order_number,
      bill_date: this.form.bill_date,
      due_date: this.form.due_date,
      payment_terms: this.form.payment_terms,
      accounts_payable: this.form.accounts_payable,
      subject: this.form.subject,
      currency: this.form.currency,
      tax_treatment: this.form.tax_treatment,
      tax_level: this.form.tax_level,
      transaction_tax: this.form.transaction_tax,
      discount_percent: Number(this.form.discount_percent),
      discount_amount: Number(this.form.discount_amount),
      adjustment: Number(this.form.adjustment),
      notes: this.form.notes,
      save_as: saveAs,
      lines: this.form.lines.map((line, idx) => ({
        item: line.item ?? null,
        description: line.description.trim(),
        account: Number(line.account),
        quantity: Number(line.quantity),
        rate: Number(line.rate),
        tax: line.tax ?? null,
        customer: line.customer ?? null,
        line_order: idx,
      })),
    };
  }

  save(saveAs: 'draft' | 'open'): void {
    if (!this.referenceDataLoaded()) {
      this.notification.error('Chart of accounts is still loading. Please wait.');
      return;
    }
    if (!this.form.vendor) {
      this.notification.error('Select or register a vendor.');
      return;
    }
    if (!this.form.bill_date) {
      this.notification.error('Bill date is required.');
      return;
    }
    if (!this.form.lines.length || this.form.lines.some((l) => !l.description.trim())) {
      this.notification.error('Each line must have item details.');
      return;
    }
    this.ensureLineAccounts();
    if (!this.accountOptionGroups().length) {
      this.notification.error('No expense accounts found. Create an expense account in Finance → Chart of Accounts first.');
      return;
    }
    if (this.form.lines.some((l) => !this.lineHasValidAccount(l))) {
      this.notification.error('Select an expense account for each line item.');
      return;
    }
    if (!this.form.currency) {
      this.notification.error('Select a currency.');
      return;
    }
    if (!this.form.accounts_payable) {
      this.notification.error('Select an accounts payable liability account.');
      return;
    }
    const payload = this.buildBillPayload(saveAs);
    this.saving.set(true);
    const id = this.editId();
    const req$ = id ? this.finance.updateBill(id, payload) : this.finance.createBill(payload);
    req$
      .pipe(
        switchMap((bill) => this.uploadPaymentProofIfNeeded(bill)),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (bill) => {
          this.notification.success(saveAs === 'open' ? 'Bill saved and opened' : 'Bill saved as draft');
          void this.router.navigate(['/finance/bills', bill.id, 'view']);
        },
      });
  }

  private uploadPaymentProofIfNeeded(bill: Bill) {
    if (!this.paymentProofFile) return of(bill);
    const billId = bill?.id;
    if (!billId) {
      this.notification.warning('Bill saved but payment proof could not be uploaded. Open the bill and try again.');
      return of(bill);
    }
    return this.finance
      .uploadBillPaymentProof(billId, this.paymentProofFile)
      .pipe(switchMap(() => this.finance.getBill(billId)));
  }
}
