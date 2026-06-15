import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Payroll } from '../../../../core/models/hr.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { formatHrAmount } from '../../../hr/constants/hr.constants';
import {
  canApprovePayroll,
  canMarkPayrollPaid,
  canViewSalary,
} from '../../../hr/utils/hr-permissions.util';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';

@Component({
  selector: 'app-finance-payroll-approval-detail',
  imports: [
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './payroll-approval-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancePayrollApprovalDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly hr = inject(HrService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly payroll = signal<Payroll | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly formatHrAmount = formatHrAmount;
  readonly canApprove = () => canApprovePayroll(this.auth);
  readonly canMarkPaid = () => canMarkPayrollPaid(this.auth);
  readonly canViewAmounts = () => canViewSalary(this.auth);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadPayroll(+id);
  }

  loadPayroll(id: number): void {
    this.loading.set(true);
    this.hr
      .getPayroll(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => this.payroll.set(p),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  approvePayroll(): void {
    const p = this.payroll();
    if (!p) return;
    this.confirm
      .open({
        title: 'Approve Payroll',
        message: `Approve ${p.payroll_number}? HR will be notified.`,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.saving.set(true);
        this.hr
          .approvePayroll(p.id)
          .pipe(finalize(() => this.saving.set(false)))
          .subscribe({
            next: (updated) => {
              this.notification.success('Payroll approved — HR has been notified');
              this.payroll.set(updated);
            },
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
      });
  }

  markPaid(): void {
    const p = this.payroll();
    if (!p) return;
    this.confirm
      .open({ title: 'Mark as Paid', message: 'Confirm payroll disbursement is complete?' })
      .subscribe((ok) => {
        if (!ok) return;
        this.saving.set(true);
        this.hr
          .markPayrollPaid(p.id)
          .pipe(finalize(() => this.saving.set(false)))
          .subscribe({
            next: (updated) => {
              this.notification.success('Payroll marked as paid');
              this.payroll.set(updated);
            },
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
      });
  }
}
