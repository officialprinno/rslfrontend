import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AttendanceVerification, Payroll } from '../../../../core/models/hr.model';
import { Department } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { HrNavComponent } from '../../components/hr-nav/hr-nav.component';
import { formatHrAmount } from '../../constants/hr.constants';
import { canApprovePayroll, canMarkPayrollPaid, canProcessPayroll, canViewSalary } from '../../utils/hr-permissions.util';

@Component({
  selector: 'app-payroll-process',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    HrNavComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './payroll-process.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollProcessComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hr = inject(HrService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly step = signal(0);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly payroll = signal<Payroll | null>(null);
  readonly attendanceCheck = signal<AttendanceVerification | null>(null);
  readonly departments = signal<Department[]>([]);
  readonly isNew = signal(true);
  readonly payrollId = signal<number | null>(null);

  readonly periodMonth = signal(new Date().getMonth() + 1);
  readonly periodYear = signal(new Date().getFullYear());
  readonly department = signal<number | null>(null);

  readonly formatHrAmount = formatHrAmount;
  readonly canProcess = () => canProcessPayroll(this.auth);
  readonly canApprove = () => canApprovePayroll(this.auth);
  readonly canMarkPaid = () => canMarkPayrollPaid(this.auth);
  readonly canViewAmounts = () => canViewSalary(this.auth);

  readonly steps = ['Setup', 'Review Items', 'Approve & Pay'];
  readonly months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  ngOnInit(): void {
    this.departmentsService.getDepartments().subscribe((d) => this.departments.set(d));
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isNew.set(false);
      this.payrollId.set(+id);
      this.loadPayroll(+id);
    }
  }

  loadPayroll(id: number): void {
    this.loading.set(true);
    this.hr
      .getPayroll(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => {
          this.payroll.set(p);
          this.periodMonth.set(p.period_month);
          this.periodYear.set(p.period_year);
          this.department.set(p.department);
          this.setStepFromStatus(p);
          this.loadAttendanceCheck();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  setStepFromStatus(payroll: Payroll): void {
    if (payroll.status === 'DRAFT') this.step.set(1);
    else if (payroll.status === 'REVIEWED') this.step.set(2);
    else this.step.set(2);
  }

  loadAttendanceCheck(): void {
    const p = this.payroll();
    if (!p) return;
    this.hr.getAttendanceCheck(p.period_month, p.period_year, p.department).subscribe({
      next: (check) => this.attendanceCheck.set(check),
    });
  }

  generatePayroll(): void {
    if (!this.canProcess()) return;
    this.saving.set(true);
    this.hr
      .generatePayroll({
        period_month: this.periodMonth(),
        period_year: this.periodYear(),
        department: this.department(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (p) => {
          this.notification.success('Payroll generated');
          this.payroll.set(p);
          this.payrollId.set(p.id);
          this.isNew.set(false);
          this.step.set(1);
          this.loadAttendanceCheck();
          this.router.navigate(['/hr/payroll', p.id], { replaceUrl: true });
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  goToStep(index: number): void {
    if (index === 0 && !this.isNew()) return;
    if (index > 0 && !this.payroll()) return;
    this.step.set(index);
  }

  submitForReview(): void {
    const p = this.payroll();
    if (!p) return;
    this.confirm.open({ title: 'Submit to Finance', message: 'Submit this payroll to Finance for approval?' }).subscribe((ok) => {
      if (!ok) return;
      this.saving.set(true);
      this.hr
        .submitPayroll(p.id)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (updated) => {
            this.notification.success('Payroll submitted to Finance for approval');
            this.payroll.set(updated);
            this.step.set(2);
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
    });
  }

  approvePayroll(): void {
    const p = this.payroll();
    if (!p) return;
    this.confirm.open({ title: 'Approve Payroll', message: 'Approve this payroll?' }).subscribe((ok) => {
      if (!ok) return;
      this.saving.set(true);
      this.hr
        .approvePayroll(p.id)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (updated) => {
            this.notification.success('Payroll approved');
            this.payroll.set(updated);
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
    });
  }

  markPaid(): void {
    const p = this.payroll();
    if (!p) return;
    this.confirm.open({ title: 'Mark as Paid', message: 'Mark payroll as paid?' }).subscribe((ok) => {
      if (!ok) return;
      this.saving.set(true);
      this.hr
        .markPayrollPaid(p.id)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (updated) => {
            this.notification.success('Payroll marked as paid');
            this.payroll.set(updated);
            this.router.navigate(['/hr/payroll']);
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
    });
  }

}
