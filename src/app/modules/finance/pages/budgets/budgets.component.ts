import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Account, Budget, BudgetSummaryRow } from '../../../../core/models/finance.model';
import { Department } from '../../../../core/models/procurement.model';
import { PaginatedData } from '../../../../core/models/paginated.model';
import { AuthService } from '../../../../core/services/auth.service';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import {
  BUDGET_PERIODS,
  BUDGET_STATUS_COLORS,
  formatAccountingAmount,
} from '../../constants/finance.constants';
import { canManageBudgets, canViewFinance } from '../../utils/finance-permissions.util';

@Component({
  selector: 'app-budgets',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FinanceNavComponent,
    ModalComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './budgets.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetsComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly budgets = signal<Budget[]>([]);
  readonly summary = signal<BudgetSummaryRow[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly accounts = signal<Account[]>([]);
  readonly loading = signal(true);
  readonly summaryLoading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly showCreate = signal(false);
  readonly financialYear = signal(new Date().getFullYear());

  readonly budgetPeriods = BUDGET_PERIODS;
  readonly budgetStatusColors = BUDGET_STATUS_COLORS;
  readonly formatAccountingAmount = formatAccountingAmount;
  readonly canView = () => canViewFinance(this.auth);
  readonly canManage = () => canManageBudgets(this.auth);
  readonly isOverBudget = (variance: string) => Number(variance) > 0;

  readonly createForm = this.fb.group({
    name: ['', Validators.required],
    department: [null as number | null, Validators.required],
    account: [null as number | null, Validators.required],
    financial_year: [new Date().getFullYear(), Validators.required],
    period: ['ANNUAL' as Budget['period'], Validators.required],
    amount_budgeted: [0, Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    this.departmentsService.getDepartments().subscribe((d) => this.departments.set(d));
    this.finance.getAccounts({ account_type: 'EXPENSE', page_size: 500 }).subscribe((data) => {
      const rows = Array.isArray(data) ? data : (data as PaginatedData<Account>).results;
      this.accounts.set(rows);
    });
    this.load();
    this.loadSummary();
  }

  load(): void {
    this.loading.set(true);
    this.finance
      .getBudgets({ page: this.page(), page_size: 10, financial_year: this.financialYear() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.budgets.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  loadSummary(): void {
    this.summaryLoading.set(true);
    this.finance
      .getBudgetSummary(this.financialYear())
      .pipe(finalize(() => this.summaryLoading.set(false)))
      .subscribe({
        next: (rows) => this.summary.set(rows),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  onYearChange(year: number): void {
    this.financialYear.set(year);
    this.page.set(1);
    this.load();
    this.loadSummary();
  }

  progressPercent(row: BudgetSummaryRow): number {
    const budgeted = Number(row.total_budgeted);
    const actual = Number(row.total_actual);
    if (!budgeted) return 0;
    return Math.min(100, Math.round((actual / budgeted) * 100));
  }

  progressClass(row: BudgetSummaryRow): string {
    const pct = this.progressPercent(row);
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 85) return 'bg-orange-500';
    return 'bg-green-500';
  }

  statusBadge(status: Budget['status']): string {
    const color = this.budgetStatusColors[status] ?? 'gray';
    const map: Record<string, string> = {
      green: 'badge-approved',
      orange: 'badge-partial',
      red: 'badge-rejected',
    };
    return map[color] ?? 'badge-draft';
  }

  openCreate(): void {
    this.createForm.reset({
      financial_year: this.financialYear(),
      period: 'ANNUAL',
      amount_budgeted: 0,
      notes: '',
    });
    this.showCreate.set(true);
  }

  saveBudget(): void {
    if (this.createForm.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.createForm.getRawValue();
    this.saving.set(true);
    this.finance
      .createBudget({
        name: raw.name!,
        department: raw.department!,
        account: raw.account!,
        financial_year: Number(raw.financial_year),
        period: raw.period!,
        amount_budgeted: Number(raw.amount_budgeted),
        notes: raw.notes ?? '',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Budget created');
          this.showCreate.set(false);
          this.load();
          this.loadSummary();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
