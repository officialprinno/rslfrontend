import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  AccountCategory,
  ChartOfAccount,
  ChartOfAccountFormData,
  LedgerEntry,
} from '../../../../core/models/finance.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyContextService } from '../../../../core/services/company-context.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import {
  ACCOUNT_CATEGORIES,
  ACCOUNT_SUBCATEGORIES,
  ADD_NEW_CATEGORY,
  ADD_NEW_SUBCATEGORY,
  categoryLabel,
  formatAccountingAmount,
  normalizeCategoryInput,
  normalizeSubcategoryInput,
  subcategoryLabel,
} from '../../constants/finance.constants';
import { canManageAccounts } from '../../utils/finance-permissions.util';

@Component({
  selector: 'app-accounts',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FinanceNavComponent,
    ModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './accounts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsComponent {
  private readonly finance = inject(FinanceService);
  private readonly auth = inject(AuthService);
  private readonly companyContext = inject(CompanyContextService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly accounts = signal<ChartOfAccount[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly ledgerLoading = signal(false);
  readonly showForm = signal(false);
  readonly showLedger = signal(false);
  readonly editing = signal<ChartOfAccount | null>(null);
  readonly ledgerAccount = signal<ChartOfAccount | null>(null);
  readonly ledgerEntries = signal<LedgerEntry[]>([]);
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly searchQuery = signal('');
  readonly categoryFilter = signal<string>('');
  readonly importing = signal(false);
  readonly exporting = signal(false);
  readonly suggestingCode = signal(false);

  readonly isAddMode = computed(() => !this.editing());

  readonly addNewCategory = ADD_NEW_CATEGORY;
  readonly addNewSubcategory = ADD_NEW_SUBCATEGORY;
  readonly formatAccountingAmount = formatAccountingAmount;
  readonly formatDate = formatDate;
  readonly canAdd = () => canManageAccounts(this.auth);

  readonly pageSubtitle = computed(() => {
    const company = this.companyContext.activeCompany();
    if (!company || company.id === 'consolidated') {
      return 'Company chart of accounts catalog';
    }
    return `${company.name} chart of accounts`;
  });

  constructor() {
    effect(() => {
      const company = this.companyContext.activeCompany();
      if (!company) return;
      this.categoryFilter.set('');
      this.load();
    });
  }

  readonly categoryOptions = computed(() => {
    const known = new Set<string>(ACCOUNT_CATEGORIES.map((c) => c.value));
    const extras: { value: string; label: string }[] = [];
    for (const account of this.accounts()) {
      if (!known.has(account.category) && !extras.some((e) => e.value === account.category)) {
        extras.push({
          value: account.category,
          label: account.category_display || categoryLabel(account.category),
        });
      }
    }
    extras.sort((a, b) => a.label.localeCompare(b.label));
    return [...ACCOUNT_CATEGORIES, ...extras];
  });

  readonly groupedAccounts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.categoryFilter();
    const filtered = this.accounts().filter((account) => {
      if (category && account.category !== category) return false;
      if (!query) return true;
      const haystack = [account.code, account.name, account.subcategory ?? '', account.category]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
    const groups = new Map<string, ChartOfAccount[]>();
    const labels = new Map<string, string>();
    for (const cat of ACCOUNT_CATEGORIES) {
      groups.set(cat.value, []);
      labels.set(cat.value, cat.label);
    }
    for (const account of filtered) {
      const list = groups.get(account.category) ?? [];
      list.push(account);
      groups.set(account.category, list);
      if (!labels.has(account.category)) {
        labels.set(account.category, account.category_display || categoryLabel(account.category));
      }
    }
    const predefined = ACCOUNT_CATEGORIES.map((c) => ({
      type: c.value,
      label: c.label,
      accounts: (groups.get(c.value) ?? []).sort((a, b) => a.code.localeCompare(b.code)),
    })).filter((g) => g.accounts.length > 0);
    const custom = [...groups.keys()]
      .filter((key) => !ACCOUNT_CATEGORIES.some((c) => c.value === key))
      .filter((key) => (groups.get(key)?.length ?? 0) > 0)
      .sort((a, b) => (labels.get(a) ?? a).localeCompare(labels.get(b) ?? b))
      .map((key) => ({
        type: key,
        label: labels.get(key) ?? key,
        accounts: (groups.get(key) ?? []).sort((a, b) => a.code.localeCompare(b.code)),
      }));
    return [...predefined, ...custom];
  });

  readonly form = this.fb.group({
    code: [''],
    name: ['', Validators.required],
    categorySelection: ['ASSETS' as string, Validators.required],
    newCategoryName: [''],
    subcategorySelection: [''],
    newSubcategoryName: [''],
    normal_balance: ['DEBIT' as 'DEBIT' | 'CREDIT'],
    parent_account: [null as number | null],
    description: [''],
    is_active: [true],
  });

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string> = {};
    const category = this.categoryFilter();
    if (category) params['category'] = category;
    this.finance
      .getChartOfAccounts(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.accounts.set(data.results),
        error: () => this.error.set(true),
      });
  }

  onCategoryFilterChange(value: string): void {
    this.categoryFilter.set(value);
    this.load();
  }

  importOfficialCoa(): void {
    if (!this.canAdd()) return;
    this.importing.set(true);
    this.finance
      .importChartOfAccounts()
      .pipe(finalize(() => this.importing.set(false)))
      .subscribe({
        next: (stats) => {
          this.notification.success(
            `Import complete — created ${stats.created}, updated ${stats.updated}, skipped ${stats.skipped}`,
          );
          this.load();
        },
        error: (e) =>
          this.notification.error(getApiErrorMessage(e, 'Failed to import chart of accounts')),
      });
  }

  exportCoa(): void {
    this.exporting.set(true);
    this.finance
      .exportChartOfAccounts(this.categoryFilter() ? { category: this.categoryFilter() } : {})
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (rows) => {
          const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `rsl-chart-of-accounts-${new Date().toISOString().slice(0, 10)}.json`;
          anchor.click();
          URL.revokeObjectURL(url);
          this.notification.success('Chart of accounts exported');
        },
        error: (e) =>
          this.notification.error(getApiErrorMessage(e, 'Failed to export chart of accounts')),
      });
  }

  effectiveCategory(): string {
    const selection = this.form.controls.categorySelection.value;
    if (selection === ADD_NEW_CATEGORY) {
      const name = this.form.controls.newCategoryName.value?.trim() ?? '';
      return name ? normalizeCategoryInput(name) : '';
    }
    return selection ?? '';
  }

  isNewCategoryMode(): boolean {
    return this.form.controls.categorySelection.value === ADD_NEW_CATEGORY;
  }

  isNewSubcategoryMode(): boolean {
    return this.form.controls.subcategorySelection.value === ADD_NEW_SUBCATEGORY;
  }

  subcategoryOptions(): { value: string; label: string }[] {
    const category = this.effectiveCategory();
    if (!category) return [];

    const predefined = [...(ACCOUNT_SUBCATEGORIES[category] ?? [])];
    const known = new Set(predefined.map((s) => s.value));
    const extras: { value: string; label: string }[] = [];

    for (const account of this.accounts()) {
      if (account.category !== category || !account.subcategory) continue;
      if (!known.has(account.subcategory)) {
        known.add(account.subcategory);
        extras.push({
          value: account.subcategory,
          label: account.subcategory_display || subcategoryLabel(account.subcategory),
        });
      }
    }
    extras.sort((a, b) => a.label.localeCompare(b.label));
    return [...predefined, ...extras];
  }

  effectiveSubcategory(): string | null {
    const selection = this.form.controls.subcategorySelection.value;
    if (!selection) return null;
    if (selection === ADD_NEW_SUBCATEGORY) {
      const name = this.form.controls.newSubcategoryName.value?.trim() ?? '';
      return name ? normalizeSubcategoryInput(name) : null;
    }
    return selection;
  }

  parentOptions(excludeId?: number): ChartOfAccount[] {
    const category = this.effectiveCategory();
    if (!category) return [];
    return this.accounts().filter(
      (a) => a.id !== excludeId && a.is_active && a.category === category,
    );
  }

  onCategoryChange(): void {
    const parent = this.form.controls.parent_account.value;
    const category = this.effectiveCategory();
    if (parent) {
      const parentAccount = this.accounts().find((a) => a.id === parent);
      if (!parentAccount || parentAccount.category !== category) {
        this.form.patchValue({ parent_account: null });
      }
    }
    this.form.patchValue({
      subcategorySelection: '',
      newSubcategoryName: '',
    });
    if (this.isNewCategoryMode()) return;
    const cat = ACCOUNT_CATEGORIES.find((c) => c.value === this.form.controls.categorySelection.value);
    if (cat) {
      this.form.patchValue({ normal_balance: cat.normalBalance as 'DEBIT' | 'CREDIT' });
    }
    this.suggestAccountCode();
  }

  onSubcategoryChange(): void {
    this.suggestAccountCode();
  }

  onParentChange(): void {
    this.suggestAccountCode();
  }

  suggestAccountCode(): void {
    if (this.editing()) return;
    const category = this.effectiveCategory();
    if (!category) return;
    if (this.isNewSubcategoryMode() && !this.effectiveSubcategory()) return;

    this.suggestingCode.set(true);
    this.finance
      .getNextChartAccountCode({
        category,
        subcategory: this.effectiveSubcategory(),
        parent_account: this.form.controls.parent_account.value,
      })
      .pipe(finalize(() => this.suggestingCode.set(false)))
      .subscribe({
        next: (result) => this.form.patchValue({ code: result.code }),
        error: () => {
          /* Backend generates on save if suggestion fails */
        },
      });
  }

  openAdd(): void {
    this.editing.set(null);
    this.fieldErrors.set({});
    this.form.reset({
      code: '',
      name: '',
      categorySelection: 'ASSETS',
      newCategoryName: '',
      subcategorySelection: '',
      newSubcategoryName: '',
      normal_balance: 'DEBIT',
      parent_account: null,
      description: '',
      is_active: true,
    });
    this.form.controls.code.disable();
    this.showForm.set(true);
    this.suggestAccountCode();
  }

  openEdit(account: ChartOfAccount): void {
    this.editing.set(account);
    this.fieldErrors.set({});
    this.form.controls.code.disable();
    this.form.patchValue({
      code: account.code,
      name: account.name,
      categorySelection: account.category,
      newCategoryName: '',
      subcategorySelection: account.subcategory ?? '',
      newSubcategoryName: '',
      normal_balance: account.normal_balance,
      parent_account: account.parent_account,
      description: account.description ?? '',
      is_active: account.is_active,
    });
    this.showForm.set(true);
  }

  openLedger(account: ChartOfAccount): void {
    this.ledgerAccount.set(account);
    this.ledgerEntries.set([]);
    this.showLedger.set(true);
    this.ledgerLoading.set(true);
    this.finance
      .getChartOfAccountLedger(account.id)
      .pipe(finalize(() => this.ledgerLoading.set(false)))
      .subscribe({
        next: (entries) => this.ledgerEntries.set(entries),
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to load ledger')),
      });
  }

  onSubmit(): void {
    const category = this.effectiveCategory();
    if (!category) {
      this.form.controls.newCategoryName.markAsTouched();
      this.notification.error('Please enter a category name.');
      return;
    }
    if (this.isNewSubcategoryMode() && !this.effectiveSubcategory()) {
      this.form.controls.newSubcategoryName.markAsTouched();
      this.notification.error('Please enter a subcategory name.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Please complete all required fields.');
      return;
    }
    const raw = this.form.getRawValue();
    const edit = this.editing();
    const data: ChartOfAccountFormData = {
      name: (raw.name ?? '').trim(),
      category: category as AccountCategory,
      subcategory: this.effectiveSubcategory(),
      normal_balance: raw.normal_balance ?? 'DEBIT',
      parent_account: raw.parent_account,
      description: raw.description ?? '',
      is_active: raw.is_active ?? true,
    };
    if (edit) {
      data.code = (raw.code ?? '').trim();
    } else {
      const code = (raw.code ?? '').trim();
      if (code) data.code = code;
    }
    this.saving.set(true);
    const req$ = edit
      ? this.finance.updateChartOfAccount(edit.id, data)
      : this.finance.createChartOfAccount(data);
    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notification.success(edit ? 'Account updated' : 'Account created');
        this.showForm.set(false);
        this.load();
      },
      error: (err) => {
        const httpErr = err as { error?: { errors?: unknown } };
        if (httpErr.error?.errors) {
          this.fieldErrors.set(extractFieldErrors(httpErr.error.errors as never));
        }
        this.notification.error(getApiErrorMessage(err, 'Failed to save account'));
      },
    });
  }
}
