import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { Currency } from '../../../../core/models/inventory.model';
import { Account, JELine, JournalEntryFormData } from '../../../../core/models/finance.model';
import { Department } from '../../../../core/models/procurement.model';
import { PaginatedData } from '../../../../core/models/paginated.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatAccountingAmount, JE_REFERENCE_TYPES } from '../../constants/finance.constants';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  SearchableSelectComponent,
  SelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { canCreateJournal, canPostJournal } from '../../utils/finance-permissions.util';

@Component({
  selector: 'app-journal-entry-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './journal-entry-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalEntryFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly finance = inject(FinanceService);
  private readonly currencyService = inject(CurrencyService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly notification = inject(NotificationService);
  private readonly auth = inject(AuthService);

  readonly accounts = signal<Account[]>([]);
  readonly currencies = signal<Currency[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);
  readonly jeStatus = signal<string>('DRAFT');

  readonly referenceTypes = JE_REFERENCE_TYPES;
  readonly formatAccountingAmount = formatAccountingAmount;
  readonly canSave = () => canCreateJournal(this.auth);
  readonly canPost = () => canPostJournal(this.auth);

  readonly form = this.fb.group({
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    reference_type: ['MANUAL' as JournalEntryFormData['reference_type'], Validators.required],
    reference_id: [''],
    description: ['', Validators.required],
    currency: [null as number | null, Validators.required],
    exchange_rate: [1, [Validators.required, Validators.min(0.0001)]],
    lines: this.fb.array([]),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({
      accounts: this.finance.getAccounts({ page_size: 500, is_active: true }),
      currencies: this.currencyService.getCurrencies(),
      departments: this.departmentsService.getDepartments(),
    }).subscribe(({ accounts, currencies, departments }) => {
      const accountList = Array.isArray(accounts)
        ? accounts
        : (accounts as PaginatedData<Account>).results;
      this.accounts.set(accountList);
      this.currencies.set(currencies);
      this.departments.set(departments);
      if (!this.form.controls.currency.value && currencies.length) {
        const tzs = currencies.find((c) => c.code === 'TZS') ?? currencies[0];
        this.form.controls.currency.setValue(tzs.id);
      }
      if (id) {
        this.editId.set(+id);
        this.loadEntry(+id);
      } else {
        this.addLine();
        this.addLine();
      }
    });
  }

  lines(): FormArray {
    return this.form.get('lines') as FormArray;
  }

  accountOptions(): SelectOption[] {
    return this.accounts().map((a) => ({
      value: a.id,
      label: `${a.account_code} — ${a.account_name}`,
      sublabel: a.account_type,
    }));
  }

  departmentOptions(): SelectOption[] {
    return this.departments().map((d) => ({
      value: d.id,
      label: d.name,
    }));
  }

  loadEntry(id: number): void {
    this.finance.getJournalEntry(id).subscribe({
      next: (je) => {
        if (je.status !== 'DRAFT') {
          this.notification.error('Only draft journal entries can be edited.');
          void this.router.navigate(['/finance/journal-entries']);
          return;
        }
        this.jeStatus.set(je.status);
        this.form.patchValue({
          date: je.date,
          reference_type: je.reference_type,
          reference_id: je.reference_id,
          description: je.description,
          currency: je.currency_id,
          exchange_rate: Number(je.exchange_rate),
        });
        this.lines().clear();
        je.lines.forEach((line) =>
          this.addLine(line.account_id ?? line.account, line.description, line.department_id ?? line.department, line.debit_amount, line.credit_amount),
        );
        if (!je.lines.length) {
          this.addLine();
          this.addLine();
        }
      },
      error: (e) => {
        this.notification.error(getApiErrorMessage(e, 'Failed to load journal entry'));
        void this.router.navigate(['/finance/journal-entries']);
      },
    });
  }

  addLine(
    accountId?: number,
    description = '',
    departmentId: number | null = null,
    debit: number | string = 0,
    credit: number | string = 0,
  ): void {
    this.lines().push(
      this.fb.group({
        account: [accountId ?? null, Validators.required],
        description: [description],
        department: [departmentId],
        debit_amount: [Number(debit) || 0, [Validators.min(0)]],
        credit_amount: [Number(credit) || 0, [Validators.min(0)]],
      }),
    );
  }

  removeLine(index: number): void {
    if (this.lines().length <= 2) {
      this.notification.error('Journal entry must have at least two lines.');
      return;
    }
    this.lines().removeAt(index);
  }

  onAccountSelect(index: number, accountId: number | string | null): void {
    this.lines().at(index).patchValue({ account: accountId });
  }

  onDepartmentSelect(index: number, deptId: number | string | null): void {
    this.lines().at(index).patchValue({ department: deptId });
  }

  onDebitChange(index: number): void {
    const line = this.lines().at(index);
    const debit = Number(line.value.debit_amount ?? 0);
    if (debit > 0) line.patchValue({ credit_amount: 0 });
  }

  onCreditChange(index: number): void {
    const line = this.lines().at(index);
    const credit = Number(line.value.credit_amount ?? 0);
    if (credit > 0) line.patchValue({ debit_amount: 0 });
  }

  totalDebit(): number {
    return this.lines().controls.reduce((sum, c) => sum + Number(c.value.debit_amount ?? 0), 0);
  }

  totalCredit(): number {
    return this.lines().controls.reduce((sum, c) => sum + Number(c.value.credit_amount ?? 0), 0);
  }

  isBalanced(): boolean {
    return Math.abs(this.totalDebit() - this.totalCredit()) < 0.01;
  }

  balanceDifference(): number {
    return this.totalDebit() - this.totalCredit();
  }

  buildPayload(): JournalEntryFormData {
    const raw = this.form.getRawValue();
    return {
      date: raw.date!,
      reference_type: raw.reference_type!,
      reference_id: raw.reference_id ?? '',
      description: (raw.description ?? '').trim(),
      currency: raw.currency!,
      exchange_rate: Number(raw.exchange_rate),
      lines: this.lines().controls.map((c) => ({
        account: c.value.account,
        description: c.value.description ?? '',
        department: c.value.department ?? null,
        debit_amount: Number(c.value.debit_amount ?? 0),
        credit_amount: Number(c.value.credit_amount ?? 0),
      })) as JELine[],
    };
  }

  validateForm(): boolean {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Please complete all required fields.');
      return false;
    }
    if (!this.isBalanced()) {
      this.notification.error('Journal entry must be balanced (total debits = total credits).');
      return false;
    }
    const hasAmount = this.lines().controls.some(
      (c) => Number(c.value.debit_amount) > 0 || Number(c.value.credit_amount) > 0,
    );
    if (!hasAmount) {
      this.notification.error('At least one line must have a debit or credit amount.');
      return false;
    }
    return true;
  }

  saveDraft(): void {
    if (!this.validateForm()) return;
    this.saving.set(true);
    const payload = this.buildPayload();
    const editId = this.editId();
    const req$ = editId
      ? this.finance.updateJournalEntry(editId, payload)
      : this.finance.createJournalEntry(payload);

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (je) => {
        this.notification.success(editId ? 'Journal entry saved' : 'Journal entry created as draft');
        if (!editId) {
          this.editId.set(je.id);
          void this.router.navigate(['/finance/journal-entries', je.id, 'edit'], { replaceUrl: true });
        }
      },
      error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to save journal entry')),
    });
  }

  saveAndPost(): void {
    if (!this.validateForm()) return;
    if (!this.canPost()) {
      this.notification.error('You do not have permission to post journal entries.');
      return;
    }
    this.saving.set(true);
    const payload = this.buildPayload();
    const editId = this.editId();
    const save$ = editId
      ? this.finance.updateJournalEntry(editId, payload)
      : this.finance.createJournalEntry(payload);

    save$
      .pipe(
        switchMap((je) => this.finance.postJournalEntry(je.id)),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.notification.success('Journal entry posted');
          void this.router.navigate(['/finance/journal-entries']);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to post journal entry')),
      });
  }
}
