import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  Account,
  NSSFSummary,
  PAYESummary,
  TaxSetting,
  TaxSettingSummary,
  TaxSummaryTab,
  VATSummary,
} from '../../../../core/models/finance.model';
import { PaginatedData } from '../../../../core/models/paginated.model';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';
import {
  exportNSSFSummaryPdf,
  exportPAYESummaryPdf,
  exportVATSummaryPdf,
} from '../../../../core/utils/finance-pdf.util';
import { formatAccountingAmount } from '../../constants/finance.constants';
import { buildChartOfAccountSelectGroups } from '../../utils/finance-account-options.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  SearchableSelectComponent,
  SelectCategoryGroup,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const APPLICABLE_OPTIONS = [
  { value: 'SALES', label: 'Sales' },
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'PAYROLL', label: 'Payroll' },
];

@Component({
  selector: 'app-finance-tax',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FinanceNavComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
    ModalComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './tax.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly tabs = signal<TaxSummaryTab[]>([
    { id: 'vat', kind: 'builtin', label: 'VAT Returns', tax_setting_id: null },
    { id: 'paye', kind: 'builtin', label: 'PAYE Summary', tax_setting_id: null },
    { id: 'nssf', kind: 'builtin', label: 'NSSF Summary', tax_setting_id: null },
    { id: 'settings', kind: 'settings', label: 'Tax Settings', tax_setting_id: null },
  ]);
  readonly activeTabId = signal('vat');
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly savingSettingId = signal<number | null>(null);
  readonly savingForm = signal(false);
  readonly showModal = signal(false);
  readonly editing = signal<TaxSetting | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly vatSummary = signal<VATSummary | null>(null);
  readonly payeSummary = signal<PAYESummary | null>(null);
  readonly nssfSummary = signal<NSSFSummary | null>(null);
  readonly customSummary = signal<TaxSettingSummary | null>(null);
  readonly taxSettings = signal<TaxSetting[]>([]);
  readonly liabilityAccountGroups = signal<SelectCategoryGroup[]>([]);
  readonly expenseAccountGroups = signal<SelectCategoryGroup[]>([]);
  readonly receivableAccountGroups = signal<SelectCategoryGroup[]>([]);

  readonly months = MONTHS;
  readonly applicableOptions = APPLICABLE_OPTIONS;
  readonly formatAmount = formatAccountingAmount;

  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();
  readonly years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  readonly activeTab = computed(
    () => this.tabs().find((t) => t.id === this.activeTabId()) ?? this.tabs()[0],
  );

  readonly form = this.fb.group({
    name: ['', Validators.required],
    code: [''],
    rate: ['0', [Validators.required, Validators.min(0)]],
    applicable_to: ['PAYROLL' as string, Validators.required],
    description: [''],
    liability_account: [null as number | null, Validators.required],
    expense_account: [null as number | null],
    receivable_account: [null as number | null],
    show_in_summary: [true],
    is_active: [true],
  });

  constructor() {
    // Live auto-generate code from name until the user edits code manually.
    this.form.controls.name.valueChanges.pipe(takeUntilDestroyed()).subscribe((name) => {
      const codeCtrl = this.form.controls.code;
      if (!codeCtrl.dirty && !this.editing()?.is_system) {
        codeCtrl.setValue(this.autoCode(name || ''), { emitEvent: false });
      }
    });
  }

  private autoCode(name: string): string {
    return name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 64);
  }

  ngOnInit(): void {
    this.loadTabs();
    this.loadAccountOptions();
    this.loadActiveTab();
  }

  loadTabs(): void {
    this.finance.getTaxSummaryTabs().subscribe({
      next: (tabs) => {
        if (tabs?.length) this.tabs.set(tabs);
      },
      error: () => {
        /* keep builtin fallback tabs */
      },
    });
  }

  loadAccountOptions(): void {
    this.finance.getAccounts({ is_active: true, page_size: 500 }).subscribe({
      next: (data) => {
        const rows = Array.isArray(data) ? data : (data as PaginatedData<Account>).results ?? [];
        const byType = (types: string[]): Account[] => {
          const filtered = rows.filter((a) => types.includes(a.account_type));
          return filtered.length ? filtered : rows;
        };
        this.liabilityAccountGroups.set(
          buildChartOfAccountSelectGroups(byType(['LIABILITY'])),
        );
        this.expenseAccountGroups.set(buildChartOfAccountSelectGroups(byType(['EXPENSE'])));
        this.receivableAccountGroups.set(buildChartOfAccountSelectGroups(byType(['ASSET'])));
      },
    });
  }

  setTab(tabId: string): void {
    this.activeTabId.set(tabId);
    this.loadActiveTab();
  }

  onPeriodChange(): void {
    if (this.activeTab().kind !== 'settings') {
      this.loadActiveTab();
    }
  }

  loadActiveTab(): void {
    const tab = this.activeTab();
    if (!tab) return;
    if (tab.kind === 'settings') this.loadSettings();
    else if (tab.id === 'vat') this.loadVAT();
    else if (tab.id === 'paye') this.loadPAYE();
    else if (tab.id === 'nssf') this.loadNSSF();
    else if (tab.kind === 'custom' && tab.tax_setting_id) this.loadCustom(tab.tax_setting_id);
  }

  loadVAT(): void {
    this.loading.set(true);
    this.error.set(false);
    this.finance
      .getVATSummary(this.month, this.year)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.vatSummary.set(data),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  loadPAYE(): void {
    this.loading.set(true);
    this.error.set(false);
    this.finance
      .getPAYESummary(this.month, this.year)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.payeSummary.set(data),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  loadNSSF(): void {
    this.loading.set(true);
    this.error.set(false);
    this.finance
      .getNSSFSummary(this.month, this.year)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.nssfSummary.set(data),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  loadCustom(taxSettingId: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.customSummary.set(null);
    this.finance
      .getTaxSettingSummary(taxSettingId, this.month, this.year)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.customSummary.set(data),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  loadSettings(): void {
    this.loading.set(true);
    this.error.set(false);
    this.finance
      .listTaxSettings()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.taxSettings.set(data),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  exportActiveTab(): void {
    const tab = this.activeTab();
    if (!tab) return;
    if (tab.id === 'vat') {
      const data = this.vatSummary();
      if (data) exportVATSummaryPdf(data);
    } else if (tab.id === 'paye') {
      const data = this.payeSummary();
      if (data) exportPAYESummaryPdf(data);
    } else if (tab.id === 'nssf') {
      const data = this.nssfSummary();
      if (data) exportNSSFSummaryPdf(data);
    } else {
      this.notification.info('PDF export for custom tax summaries will use the on-screen table.');
    }
  }

  openCreate(): void {
    this.editing.set(null);
    this.fieldErrors.set({});
    this.form.reset({
      name: '',
      code: '',
      rate: '0',
      applicable_to: 'PAYROLL',
      description: '',
      liability_account: null,
      expense_account: null,
      receivable_account: null,
      show_in_summary: true,
      is_active: true,
    });
    this.form.controls.code.enable();
    this.form.controls.liability_account.setValidators([Validators.required]);
    this.form.controls.liability_account.updateValueAndValidity();
    this.showModal.set(true);
  }

  openEdit(setting: TaxSetting): void {
    this.editing.set(setting);
    this.fieldErrors.set({});
    this.form.reset({
      name: setting.name,
      code: setting.code,
      rate: String(setting.rate),
      applicable_to: setting.applicable_to,
      description: setting.description || '',
      liability_account: setting.liability_account,
      expense_account: setting.expense_account,
      receivable_account: setting.receivable_account,
      show_in_summary: setting.show_in_summary,
      is_active: setting.is_active,
    });
    // Keep the stored code; only openCreate auto-generates from name.
    this.form.controls.code.setValue(setting.code);
    this.form.controls.code.markAsDirty();
    if (setting.is_system) {
      this.form.controls.code.disable();
      this.form.controls.liability_account.clearValidators();
    } else {
      this.form.controls.code.enable();
      this.form.controls.liability_account.setValidators([Validators.required]);
    }
    this.form.controls.liability_account.updateValueAndValidity();
    this.showModal.set(true);
  }

  setAccount(control: 'liability_account' | 'expense_account' | 'receivable_account', value: unknown): void {
    this.form.controls[control].setValue(value != null && value !== '' ? Number(value) : null);
    this.fieldErrors.update((errs) => {
      if (!(control in errs)) return errs;
      const next = { ...errs };
      delete next[control];
      return next;
    });
  }

  saveTax(): void {
    this.fieldErrors.set({});
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const errs: Record<string, string> = {};
      if (this.form.controls.name.invalid) {
        errs['name'] = 'Tax name is required.';
      }
      if (this.form.controls.rate.invalid) {
        errs['rate'] = 'Enter a valid rate (0 or more).';
      }
      if (this.form.controls.liability_account.invalid) {
        errs['liability_account'] =
          'Select the liability account from Chart of Accounts — it is required for journal posting.';
      }
      this.fieldErrors.set(errs);
      this.notification.error('Complete the highlighted fields before saving.');
      return;
    }
    const raw = this.form.getRawValue();
    const payload: Partial<TaxSetting> = {
      name: (raw.name || '').trim(),
      code: (raw.code || '').trim().toUpperCase().replace(/\s+/g, '_'),
      rate: String(raw.rate ?? '0'),
      applicable_to: raw.applicable_to || 'PAYROLL',
      description: (raw.description || '').trim(),
      liability_account: raw.liability_account,
      expense_account: raw.expense_account,
      receivable_account: raw.receivable_account,
      show_in_summary: !!raw.show_in_summary,
      is_active: !!raw.is_active,
    };
    if (!payload.code) {
      payload.code = undefined;
    }

    const editing = this.editing();
    this.savingForm.set(true);
    const req$ = editing
      ? this.finance.updateTaxSetting(editing.id, payload)
      : this.finance.createTaxSetting(payload);

    req$.pipe(finalize(() => this.savingForm.set(false))).subscribe({
      next: () => {
        this.notification.success(editing ? 'Tax setting updated' : 'Tax setting created');
        this.showModal.set(false);
        this.loadSettings();
        this.loadTabs();
      },
      error: (e) => {
        this.fieldErrors.set(extractFieldErrors(e));
        this.notification.error(getApiErrorMessage(e));
      },
    });
  }

  updateSetting(setting: TaxSetting, field: 'rate' | 'is_active', value: string | boolean): void {
    this.savingSettingId.set(setting.id);
    const payload: Partial<TaxSetting> =
      field === 'rate' ? { rate: String(value) } : { is_active: Boolean(value) };

    this.finance
      .updateTaxSetting(setting.id, payload)
      .pipe(finalize(() => this.savingSettingId.set(null)))
      .subscribe({
        next: (updated) => {
          this.taxSettings.update((list) =>
            list.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
          );
          this.notification.success('Tax setting updated');
          if (field === 'is_active') this.loadTabs();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  deactivate(setting: TaxSetting): void {
    if (setting.is_system) {
      this.notification.error('System tax settings cannot be deleted.');
      return;
    }
    this.savingSettingId.set(setting.id);
    this.finance
      .deactivateTaxSetting(setting.id)
      .pipe(finalize(() => this.savingSettingId.set(null)))
      .subscribe({
        next: () => {
          this.notification.success('Tax setting deactivated');
          this.loadSettings();
          this.loadTabs();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  accountLabel(setting: TaxSetting): string {
    if (setting.liability_account_code) {
      return `${setting.liability_account_code} — ${setting.liability_account_name || ''}`.trim();
    }
    return '—';
  }

  periodLabel(): string {
    const m = this.months.find((item) => item.value === this.month);
    return `${m?.label ?? this.month} ${this.year}`;
  }

  fieldError(key: string): string {
    return this.fieldErrors()[key] || '';
  }
}
