import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Currency } from '../../../../core/models/inventory.model';
import { Account, BankAccount } from '../../../../core/models/finance.model';
import { PaginatedData } from '../../../../core/models/paginated.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { formatAccountingAmount, maskAccountNumber } from '../../constants/finance.constants';
import { canManageAccounts, canViewFinance } from '../../utils/finance-permissions.util';

@Component({
  selector: 'app-bank-accounts',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FinanceNavComponent,
    ModalComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './bank-accounts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BankAccountsComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly currencyService = inject(CurrencyService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly accounts = signal<BankAccount[]>([]);
  readonly glAccounts = signal<Account[]>([]);
  readonly currencies = signal<Currency[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly editing = signal<BankAccount | null>(null);

  readonly maskAccountNumber = maskAccountNumber;
  readonly formatAccountingAmount = formatAccountingAmount;
  readonly formatDate = formatDate;
  readonly canView = () => canViewFinance(this.auth);
  readonly canManage = () => canManageAccounts(this.auth);

  readonly accountForm = this.fb.group({
    bank_name: ['', Validators.required],
    account_number: ['', Validators.required],
    account_name: ['', Validators.required],
    currency: [null as number | null, Validators.required],
    gl_account: [null as number | null, Validators.required],
    opening_balance: [0],
    is_active: [true],
  });

  ngOnInit(): void {
    this.currencyService.getCurrencies().subscribe((c) => this.currencies.set(c));
    this.finance.getAccounts({ account_type: 'ASSET', page_size: 500 }).subscribe((data) => {
      const rows = Array.isArray(data) ? data : (data as PaginatedData<Account>).results;
      this.glAccounts.set(rows);
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.finance
      .getBankAccounts()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rows) => this.accounts.set(rows),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openAdd(): void {
    this.editing.set(null);
    this.accountForm.reset({
      currency: this.currencies()[0]?.id ?? null,
      opening_balance: 0,
      is_active: true,
    });
    this.showForm.set(true);
  }

  openEdit(account: BankAccount): void {
    this.editing.set(account);
    this.accountForm.patchValue({
      bank_name: account.bank_name,
      account_number: account.account_number,
      account_name: account.account_name,
      currency: account.currency_id,
      gl_account: account.gl_account_id,
      opening_balance: Number(account.opening_balance),
      is_active: account.is_active,
    });
    this.showForm.set(true);
  }

  save(): void {
    if (this.accountForm.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.accountForm.getRawValue();
    const payload = {
      bank_name: raw.bank_name!,
      account_number: raw.account_number!,
      account_name: raw.account_name!,
      currency: raw.currency!,
      gl_account: raw.gl_account!,
      opening_balance: Number(raw.opening_balance ?? 0),
      is_active: raw.is_active ?? true,
    };
    this.saving.set(true);
    const edit = this.editing();
    const req = edit
      ? this.finance.updateBankAccount(edit.id, payload)
      : this.finance.createBankAccount(payload);
    req.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notification.success(edit ? 'Bank account updated' : 'Bank account created');
        this.showForm.set(false);
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
