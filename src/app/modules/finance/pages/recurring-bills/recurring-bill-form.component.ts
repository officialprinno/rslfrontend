import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { Currency } from '../../../../core/models/inventory.model';
import {
  Account,
  FinanceCustomer,
  FinanceVendor,
  RecurringBill,
  RecurringBillFormData,
  RecurringBillLineFormData,
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
  RECURRING_BILL_FREQUENCIES,
} from '../../constants/finance.constants';
import { NewCustomerModalComponent } from '../bills/new-customer-modal.component';
import { NewVendorModalComponent } from '../bills/new-vendor-modal.component';
import { buildChartOfAccountSelectGroups } from '../../utils/finance-account-options.util';

@Component({
  selector: 'app-recurring-bill-form',
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
  templateUrl: './recurring-bill-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringBillFormComponent implements OnInit {
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
  paymentProofCleared = false;

  readonly paymentTerms = BILL_PAYMENT_TERMS;
  readonly taxTreatments = BILL_TAX_TREATMENTS;
  readonly taxLevels = BILL_TAX_LEVELS;
  readonly frequencies = RECURRING_BILL_FREQUENCIES;
  readonly formatAccountingAmount = formatAccountingAmount;

  form: RecurringBillFormData = this.emptyForm();

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

  readonly estimatedTotal = computed(() => {
    this.formRevision();
    const base =
      this.subtotal() -
      Math.max(
        (this.subtotal() * Number(this.form.discount_percent)) / 100,
        Number(this.form.discount_amount),
      ) +
      Number(this.form.adjustment);
    return Math.max(base, 0);
  });

  readonly scheduleSummary = computed(() => {
    this.formRevision();
    const freq =
      this.frequencies.find((f) => f.value === this.form.frequency)?.label?.toLowerCase() ??
      'on schedule';
    if (!this.form.start_date) {
      return 'Choose a start date to preview when bills will be generated.';
    }
    let summary = `Generates ${freq} from ${this.form.start_date}`;
    if (this.form.frequency === 'MONTHLY') {
      const dom = this.form.day_of_month ?? new Date(this.form.start_date).getDate();
      summary += ` (day ${Math.min(dom, 28)} each month)`;
    }
    if (this.form.end_date) {
      summary += ` until ${this.form.end_date}`;
    }
    summary += this.form.auto_open
      ? '. New bills are opened automatically.'
      : '. New bills are saved as drafts.';
    return summary;
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
      if (!id && !this.form.lines.length) this.addLine();
      this.referenceDataLoaded.set(true);
    });

    if (id) {
      this.editId.set(+id);
      this.loading.set(true);
      this.finance
        .getRecurringBill(+id)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (profile) => {
            this.form = {
              name: profile.name,
              vendor: profile.vendor,
              vendor_bill_number: profile.vendor_bill_number,
              order_number: profile.order_number,
              payment_terms: profile.payment_terms,
              accounts_payable: profile.accounts_payable,
              subject: profile.subject,
              currency: profile.currency,
              tax_treatment: profile.tax_treatment,
              tax_level: profile.tax_level,
              transaction_tax: profile.transaction_tax,
              discount_percent: Number(profile.discount_percent),
              discount_amount: Number(profile.discount_amount),
              adjustment: Number(profile.adjustment),
              notes: profile.notes,
              frequency: profile.frequency,
              day_of_month: profile.day_of_month,
              start_date: profile.start_date,
              end_date: profile.end_date ?? '',
              auto_open: profile.auto_open,
              status: profile.status,
              lines: profile.lines.map((l) => ({
                description: l.description,
                account: l.account,
                quantity: Number(l.quantity),
                rate: Number(l.rate),
                tax: l.tax ?? null,
                customer: l.customer ?? null,
              })),
            };
            this.paymentProofUrl = profile.payment_proof_url ?? null;
            this.paymentProofName = profile.payment_proof_name ?? null;
            this.paymentProofCleared = false;
            this.ensureLineAccounts();
            this.bumpForm();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
    }
  }

  emptyForm(): RecurringBillFormData {
    return {
      name: '',
      vendor: 0,
      vendor_bill_number: '',
      order_number: '',
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
      frequency: 'MONTHLY',
      day_of_month: null,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: '',
      auto_open: false,
      lines: [],
    };
  }

  defaultExpenseAccountId(): number | null {
    const expense = this.accounts().find((a) => a.account_type === 'EXPENSE');
    return expense?.id ?? this.accounts().find((a) => a.account_type === 'ASSET')?.id ?? null;
  }

  lineHasValidAccount(line: RecurringBillLineFormData): boolean {
    return Number(line.account) > 0;
  }

  ensureLineAccounts(): void {
    const defaultAccount = this.defaultExpenseAccountId();
    if (!defaultAccount) return;
    for (const line of this.form.lines) {
      if (!this.lineHasValidAccount(line)) line.account = defaultAccount;
    }
  }

  onLineAccountChange(line: RecurringBillLineFormData, value: number | string | null): void {
    if (value === null || value === '' || Number(value) <= 0) return;
    line.account = Number(value);
    this.bumpForm();
  }

  bumpForm(): void {
    this.formRevision.update((n) => n + 1);
  }

  lineAmount(line: RecurringBillLineFormData): number {
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

  currencyCode(): string {
    return this.currencies().find((c) => c.id === this.form.currency)?.code ?? 'TZS';
  }

  onVendorCreated(vendor: FinanceVendor): void {
    if (!this.vendors().some((v) => v.id === vendor.id)) {
      this.vendors.update((list) => [vendor, ...list]);
    }
    this.form.vendor = vendor.id;
    this.form.currency = vendor.currency;
    this.showVendorModal.set(false);
  }

  onCustomerCreated(customer: FinanceCustomer): void {
    if (!this.customers().some((c) => c.id === customer.id)) {
      this.customers.update((list) => [customer, ...list]);
    }
    const idx = this.customerModalLineIndex();
    if (idx !== null) this.form.lines[idx].customer = customer.id;
    this.showCustomerModal.set(false);
    this.customerModalLineIndex.set(null);
    this.bumpForm();
  }

  openCustomerModal(lineIndex: number): void {
    this.customerModalLineIndex.set(lineIndex);
    this.showCustomerModal.set(true);
  }

  onPaymentProofSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.paymentProofFile = file;
    this.paymentProofName = file.name;
    this.paymentProofUrl = null;
    this.paymentProofCleared = false;
    this.bumpForm();
  }

  clearPaymentProof(): void {
    this.paymentProofFile = null;
    this.paymentProofUrl = null;
    this.paymentProofName = null;
    this.paymentProofCleared = true;
    this.bumpForm();
  }

  private uploadPaymentProofIfNeeded(profile: RecurringBill) {
    if (!this.paymentProofFile || !profile?.id) return of(profile);
    return this.finance
      .uploadRecurringBillPaymentProof(profile.id, this.paymentProofFile)
      .pipe(switchMap(() => this.finance.getRecurringBill(profile.id)));
  }

  private buildPayload(): RecurringBillFormData {
    const start = new Date(this.form.start_date);
    const dayOfMonth =
      this.form.frequency === 'MONTHLY'
        ? this.form.day_of_month ?? Math.min(start.getDate(), 28)
        : null;
    return {
      ...this.form,
      day_of_month: dayOfMonth,
      end_date: this.form.end_date || null,
      discount_percent: Number(this.form.discount_percent),
      discount_amount: Number(this.form.discount_amount),
      adjustment: Number(this.form.adjustment),
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

  save(): void {
    if (!this.referenceDataLoaded()) {
      this.notification.error('Reference data is still loading. Please wait.');
      return;
    }
    if (!this.form.name.trim()) {
      this.notification.error('Profile name is required.');
      return;
    }
    if (!this.form.vendor) {
      this.notification.error('Select or register a vendor.');
      return;
    }
    if (!this.form.start_date) {
      this.notification.error('Start date is required.');
      return;
    }
    if (!this.form.lines.length || this.form.lines.some((l) => !l.description.trim())) {
      this.notification.error('Each line must have item details.');
      return;
    }
    this.ensureLineAccounts();
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

    const payload = this.buildPayload();
    this.saving.set(true);
    const id = this.editId();
    const req$ = id
      ? this.finance.updateRecurringBill(id, payload)
      : this.finance.createRecurringBill(payload);
    req$
      .pipe(
        switchMap((profile) => this.uploadPaymentProofIfNeeded(profile)),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (profile) => {
          this.notification.success(id ? 'Recurring profile updated' : 'Recurring profile created');
          void this.router.navigate(['/finance/recurring-bills', profile.id, 'view']);
        },
      });
  }
}
