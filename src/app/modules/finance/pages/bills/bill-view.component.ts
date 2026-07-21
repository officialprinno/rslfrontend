import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Bill, RecordBillPaymentData } from '../../../../core/models/finance.model';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { handleScopedRecordLoadError } from '../../../../core/utils/workspace-empty-state.util';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { CompanyWorkspaceEmptyStateComponent } from '../../../../shared/components/company-workspace-empty-state/company-workspace-empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { OpenFileComponent } from '../../../../shared/components/open-file/open-file.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { BILL_PAYMENT_METHODS } from '../../constants/finance.constants';

@Component({
  selector: 'app-bill-view',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    StatusBadgeComponent,
    OpenFileComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
    CompanyWorkspaceEmptyStateComponent,
    ModalComponent,
  ],
  templateUrl: './bill-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly finance = inject(FinanceService);
  private readonly notification = inject(NotificationService);

  readonly bill = signal<Bill | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal(false);
  readonly notInWorkspace = signal(false);
  readonly showPayment = signal(false);

  readonly paymentMethods = BILL_PAYMENT_METHODS;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  paymentForm: RecordBillPaymentData = {
    amount: 0,
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'BANK',
    reference: '',
    notes: '',
  };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.loading.set(true);
    this.error.set(false);
    this.notInWorkspace.set(false);
    this.finance
      .getBill(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (b) => {
          this.bill.set(b);
          this.paymentForm.amount = Number(b.balance_due);
        },
        error: (e) => {
          handleScopedRecordLoadError(e, this.error, this.notInWorkspace);
          if (this.error()) {
            this.notification.error(getApiErrorMessage(e));
          }
        },
      });
  }

  openBill(): void {
    const b = this.bill()!;
    this.saving.set(true);
    this.finance
      .openBill(b.id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Bill converted to open');
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  submitPayment(): void {
    const b = this.bill()!;
    this.saving.set(true);
    this.finance
      .recordBillPayment(b.id, this.paymentForm)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Payment recorded');
          this.showPayment.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
