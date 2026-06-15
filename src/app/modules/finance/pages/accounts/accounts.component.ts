import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Account, AccountFormData, AccountType, LedgerEntry } from '../../../../core/models/finance.model';
import { PaginatedData } from '../../../../core/models/paginated.model';
import { AuthService } from '../../../../core/services/auth.service';
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
  ACCOUNT_TYPES,
  accountTypeCodeRange,
  formatAccountingAmount,
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
export class AccountsComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly accounts = signal<Account[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly ledgerLoading = signal(false);
  readonly showForm = signal(false);
  readonly showLedger = signal(false);
  readonly editing = signal<Account | null>(null);
  readonly ledgerAccount = signal<Account | null>(null);
  readonly ledgerEntries = signal<LedgerEntry[]>([]);
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly expandedIds = signal<Set<number>>(new Set());

  readonly accountTypes = ACCOUNT_TYPES;
  readonly formatAccountingAmount = formatAccountingAmount;
  readonly formatDate = formatDate;
  readonly accountTypeCodeRange = accountTypeCodeRange;
  readonly typePrefix = (type: AccountType | null | undefined) =>
    ACCOUNT_TYPES.find((t) => t.value === type)?.prefix ?? '1';
  readonly canAdd = () => canManageAccounts(this.auth);
  readonly codePreviewLoading = signal(false);

  readonly groupedAccounts = computed(() => {
    const groups = new Map<AccountType, Account[]>();
    for (const type of ACCOUNT_TYPES) {
      groups.set(type.value, []);
    }
    for (const account of this.accounts()) {
      const list = groups.get(account.account_type) ?? [];
      list.push(account);
      groups.set(account.account_type, list);
    }
    return ACCOUNT_TYPES.map((t) => ({
      type: t.value,
      label: t.label,
      accounts: groups.get(t.value) ?? [],
    })).filter((g) => g.accounts.length > 0);
  });

  readonly flatAccounts = computed(() => this.flattenAccounts(this.accounts()));

  readonly form = this.fb.group({
    account_code: [''],
    account_name: ['', Validators.required],
    account_type: ['ASSET' as AccountType, Validators.required],
    parent: [null as number | null],
    description: [''],
    is_active: [true],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.finance
      .getAccounts({ tree: true })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          const list = Array.isArray(data) ? data : (data as PaginatedData<Account>).results;
          this.accounts.set(list);
          this.expandedIds.set(new Set(list.map((a) => a.id)));
        },
        error: () => this.error.set(true),
      });
  }

  flattenAccounts(accounts: Account[], depth = 0): { account: Account; depth: number }[] {
    const result: { account: Account; depth: number }[] = [];
    for (const account of accounts) {
      result.push({ account, depth });
      if (account.children?.length && this.isExpanded(account.id)) {
        result.push(...this.flattenAccounts(account.children, depth + 1));
      }
    }
    return result;
  }

  toggleExpand(id: number): void {
    const next = new Set(this.expandedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.expandedIds.set(next);
  }

  isExpanded(id: number): boolean {
    return this.expandedIds().has(id);
  }

  parentOptions(excludeId?: number): Account[] {
    const type = this.form.controls.account_type.value;
    return this.accounts().filter(
      (a) => a.id !== excludeId && a.is_active && a.account_type === type,
    );
  }

  onAccountTypeChange(): void {
    const parent = this.form.controls.parent.value;
    if (parent) {
      const parentAccount = this.accounts().find((a) => a.id === parent);
      if (!parentAccount || parentAccount.account_type !== this.form.controls.account_type.value) {
        this.form.patchValue({ parent: null });
      }
    }
    if (!this.editing()) {
      this.refreshNextCode();
    }
  }

  onParentChange(): void {
    if (!this.editing()) {
      this.refreshNextCode();
    }
  }

  refreshNextCode(): void {
    const type = this.form.controls.account_type.value;
    if (!type) return;
    this.codePreviewLoading.set(true);
    this.finance
      .getNextAccountCode(type, this.form.controls.parent.value)
      .pipe(finalize(() => this.codePreviewLoading.set(false)))
      .subscribe({
        next: (res) =>
          this.form.patchValue({ account_code: res.account_code }, { emitEvent: false }),
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Could not generate code')),
      });
  }

  openAdd(): void {
    this.editing.set(null);
    this.fieldErrors.set({});
    this.form.reset({
      account_code: '',
      account_name: '',
      account_type: 'ASSET',
      parent: null,
      description: '',
      is_active: true,
    });
    this.form.controls.account_code.disable();
    this.showForm.set(true);
    this.refreshNextCode();
  }

  openEdit(account: Account): void {
    this.editing.set(account);
    this.fieldErrors.set({});
    this.form.controls.account_code.enable();
    this.form.patchValue({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      parent: account.parent_id,
      description: account.description,
      is_active: account.is_active,
    });
    this.showForm.set(true);
  }

  openLedger(account: Account): void {
    this.ledgerAccount.set(account);
    this.ledgerEntries.set([]);
    this.showLedger.set(true);
    this.ledgerLoading.set(true);
    this.finance
      .getAccountLedger(account.id)
      .pipe(finalize(() => this.ledgerLoading.set(false)))
      .subscribe({
        next: (entries) => this.ledgerEntries.set(entries),
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to load ledger')),
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Please complete all required fields.');
      return;
    }
    const raw = this.form.getRawValue();
    const edit = this.editing();
    const data: AccountFormData = {
      account_name: (raw.account_name ?? '').trim(),
      account_type: raw.account_type ?? 'ASSET',
      parent: raw.parent,
      description: raw.description ?? '',
      is_active: raw.is_active ?? true,
    };
    if (edit) {
      data.account_code = (raw.account_code ?? '').trim();
    }
    this.saving.set(true);
    const req$ = edit
      ? this.finance.updateAccount(edit.id, data)
      : this.finance.createAccount(data);
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
