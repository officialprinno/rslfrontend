import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Payroll } from '../../../../core/models/hr.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { formatHrAmount } from '../../../hr/constants/hr.constants';
import { canApprovePayroll, canViewSalary } from '../../../hr/utils/hr-permissions.util';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';

@Component({
  selector: 'app-finance-payroll-approvals',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './payroll-approvals.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancePayrollApprovalsComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly payrolls = signal<Payroll[]>([]);
  readonly loading = signal(true);
  readonly acting = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly statusFilter = signal('REVIEWED');

  readonly formatHrAmount = formatHrAmount;
  readonly canApprove = () => canApprovePayroll(this.auth);
  readonly canViewAmounts = () => canViewSalary(this.auth);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 10,
    };
    if (this.statusFilter()) params['status'] = this.statusFilter();

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

  approvePayroll(payroll: Payroll): void {
    this.confirm
      .open({
        title: 'Approve Payroll',
        message: `Approve payroll ${payroll.payroll_number} for ${payroll.period_display}? HR will be notified.`,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.acting.set(true);
        this.hr
          .approvePayroll(payroll.id)
          .pipe(finalize(() => this.acting.set(false)))
          .subscribe({
            next: () => {
              this.notification.success('Payroll approved — HR has been notified');
              this.load();
            },
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
      });
  }
}
