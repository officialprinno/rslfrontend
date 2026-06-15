import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { EmployeeOption, Payslip } from '../../../../core/models/hr.model';
import { AuthService } from '../../../../core/services/auth.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { exportPayslipPdf } from '../../../../core/utils/hr-pdf.util';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { HrNavComponent } from '../../components/hr-nav/hr-nav.component';
import { formatHrAmount, maskBankAccount } from '../../constants/hr.constants';
import { canViewAllPayslips, canViewSalary } from '../../utils/hr-permissions.util';

@Component({
  selector: 'app-payslips',
  imports: [
    FormsModule,
    PageHeaderComponent,
    HrNavComponent,
    ModalComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './payslips.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayslipsComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly payslips = signal<Payslip[]>([]);
  readonly employees = signal<EmployeeOption[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly employeeFilter = signal<number | ''>('');
  readonly yearFilter = signal<number | ''>('');
  readonly showView = signal(false);
  readonly selected = signal<Payslip | null>(null);

  readonly formatHrAmount = formatHrAmount;
  readonly maskBankAccount = maskBankAccount;
  readonly canViewAll = () => canViewAllPayslips(this.auth);
  readonly canViewAmounts = () => canViewSalary(this.auth);

  ngOnInit(): void {
    if (this.canViewAll()) {
      this.hr.getEmployees({ page_size: 500, status: 'ACTIVE' }).subscribe({
        next: (d) => this.employees.set(d.results),
      });
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 10,
    };
    if (this.employeeFilter()) params['employee'] = this.employeeFilter() as number;
    if (this.yearFilter()) params['payroll__period_year'] = this.yearFilter() as number;

    this.hr
      .getPayslips(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.payslips.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openView(payslip: Payslip): void {
    this.selected.set(payslip);
    this.showView.set(true);
  }

  downloadPdf(payslip: Payslip): void {
    exportPayslipPdf(payslip);
  }

  allowanceEntries(payslip: Payslip): { name: string; amount: string }[] {
    return payslip.allowances ?? [];
  }
}
