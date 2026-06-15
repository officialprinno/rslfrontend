import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Payroll } from '../../../../core/models/hr.model';
import { Department } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { HrNavComponent } from '../../components/hr-nav/hr-nav.component';
import { formatHrAmount } from '../../constants/hr.constants';
import { canApprovePayroll, canMarkPayrollPaid, canProcessPayroll, canViewSalary } from '../../utils/hr-permissions.util';

@Component({
  selector: 'app-payroll-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    HrNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './payroll-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollListComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly payrolls = signal<Payroll[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly acting = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly statusFilter = signal('');
  readonly yearFilter = signal<number | ''>('');

  readonly formatHrAmount = formatHrAmount;
  readonly formatDate = formatDate;
  readonly canProcess = () => canProcessPayroll(this.auth);
  readonly canApprove = () => canApprovePayroll(this.auth);
  readonly canMarkPaid = () => canMarkPayrollPaid(this.auth);
  readonly canViewAmounts = () => canViewSalary(this.auth);

  ngOnInit(): void {
    this.departmentsService.getDepartments().subscribe((d) => this.departments.set(d));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 10,
    };
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.yearFilter()) params['period_year'] = this.yearFilter() as number;

    this.hr
      .getPayrolls(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.payrolls.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  submitPayroll(payroll: Payroll): void {
    this.confirm.open({ title: 'Submit to Finance', message: 'Submit this payroll to Finance for approval?' }).subscribe((ok) => {
      if (!ok) return;
      this.acting.set(true);
      this.hr
        .submitPayroll(payroll.id)
        .pipe(finalize(() => this.acting.set(false)))
        .subscribe({
          next: () => {
            this.notification.success('Payroll submitted to Finance for approval');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
    });
  }

  approvePayroll(payroll: Payroll): void {
    this.confirm.open({ title: 'Approve Payroll', message: 'Approve this payroll run?' }).subscribe((ok) => {
      if (!ok) return;
      this.acting.set(true);
      this.hr
        .approvePayroll(payroll.id)
        .pipe(finalize(() => this.acting.set(false)))
        .subscribe({
          next: () => {
            this.notification.success('Payroll approved');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
    });
  }

  markPaid(payroll: Payroll): void {
    this.confirm.open({ title: 'Mark as Paid', message: 'Mark payroll as paid?' }).subscribe((ok) => {
      if (!ok) return;
      this.acting.set(true);
      this.hr
        .markPayrollPaid(payroll.id)
        .pipe(finalize(() => this.acting.set(false)))
        .subscribe({
          next: () => {
            this.notification.success('Payroll marked as paid');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
    });
  }
}
