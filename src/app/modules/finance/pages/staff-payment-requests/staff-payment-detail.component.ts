import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Account } from '../../../../core/models/finance.model';
import { StaffPaymentRequest } from '../../../../core/models/staff-payment.model';
import { PaginatedData } from '../../../../core/models/paginated.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { StaffPaymentService } from '../../../../core/services/staff-payment.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { OpenFileComponent } from '../../../../shared/components/open-file/open-file.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { StaffPaymentSubnavComponent } from '../../components/staff-payment-subnav/staff-payment-subnav.component';
import {
  canApproveLiquidation,
  canFinanceApproveStaffPayment,
  canGmApproveStaffPayment,
  canHodApproveStaffPayment,
  canMarkStaffPaymentPaid,
  canSubmitLiquidation,
} from '../../utils/staff-payment-permissions.util';

@Component({
  selector: 'app-staff-payment-detail',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    StaffPaymentSubnavComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
    OpenFileComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './staff-payment-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffPaymentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly staffPayment = inject(StaffPaymentService);
  private readonly finance = inject(FinanceService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly request = signal<StaffPaymentRequest | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly expenseAccounts = signal<SelectOption[]>([]);
  readonly employeePortal = signal(false);
  readonly listPath = computed(() =>
    this.employeePortal() ? '/my-payment-requests' : '/finance/staff-payment-requests',
  );

  rejectReason = '';
  paymentReference = '';
  liquidationNotes = '';
  glAccountId: number | null = null;
  liquidationFiles: File[] = [];

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  readonly submissionAttachments = computed(
    () => this.request()?.attachments.filter((a) => a.attachment_stage === 'SUBMISSION') ?? [],
  );
  readonly liquidationAttachments = computed(
    () => this.request()?.attachments.filter((a) => a.attachment_stage === 'LIQUIDATION') ?? [],
  );

  ngOnInit(): void {
    this.employeePortal.set(!!this.route.snapshot.data['employeePortal']);
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(+id);
    this.loadExpenseAccounts();
  }

  load(id: number): void {
    this.loading.set(true);
    this.staffPayment
      .getRequest(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => this.request.set(r),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  loadExpenseAccounts(): void {
    this.finance.getAccounts({ account_type: 'EXPENSE', is_active: true }).subscribe({
      next: (data) => {
        const rows = Array.isArray(data) ? data : (data as PaginatedData<Account>).results ?? [];
        this.expenseAccounts.set(
          rows.map((a) => ({
            value: a.id,
            label: `${a.account_code} — ${a.account_name || a.name}`,
          })),
        );
      },
      error: () => this.expenseAccounts.set([]),
    });
  }

  canHod(req: StaffPaymentRequest): boolean {
    return canHodApproveStaffPayment(this.auth, req);
  }
  canGm(req: StaffPaymentRequest): boolean {
    return canGmApproveStaffPayment(this.auth, req);
  }
  canFinance(req: StaffPaymentRequest): boolean {
    return canFinanceApproveStaffPayment(this.auth, req);
  }
  canPay(req: StaffPaymentRequest): boolean {
    return canMarkStaffPaymentPaid(this.auth, req);
  }
  canLiquidate(req: StaffPaymentRequest): boolean {
    return canSubmitLiquidation(this.auth, req);
  }
  canReviewLiquidation(req: StaffPaymentRequest): boolean {
    return canApproveLiquidation(this.auth, req);
  }

  hodApprove(): void {
    const req = this.request();
    if (!req) return;
    this.runAction(() => this.staffPayment.hodApprove(req.id), 'HOD approval recorded');
  }

  hodReject(): void {
    const req = this.request();
    if (!req || !this.rejectReason.trim()) {
      this.notification.error('Rejection reason is required.');
      return;
    }
    this.runAction(
      () => this.staffPayment.hodReject(req.id, this.rejectReason.trim()),
      'Request rejected',
    );
  }

  gmApprove(): void {
    const req = this.request();
    if (!req) return;
    this.confirm
      .open({ title: 'GM Approval', message: `Approve ${req.request_number}?` })
      .subscribe((ok) => {
        if (!ok) return;
        this.runAction(() => this.staffPayment.gmApprove(req.id), 'GM approval recorded');
      });
  }

  gmReject(): void {
    const req = this.request();
    if (!req || !this.rejectReason.trim()) {
      this.notification.error('Rejection reason is required.');
      return;
    }
    this.runAction(
      () => this.staffPayment.gmReject(req.id, this.rejectReason.trim()),
      'Request rejected',
    );
  }

  financeApprove(): void {
    const req = this.request();
    if (!req || !this.glAccountId) {
      this.notification.error('Select a GL expense account.');
      return;
    }
    this.runAction(
      () => this.staffPayment.financeApprove(req.id, this.glAccountId!),
      'Finance approval recorded',
    );
  }

  financeReject(): void {
    const req = this.request();
    if (!req || !this.rejectReason.trim()) {
      this.notification.error('Rejection reason is required.');
      return;
    }
    this.runAction(
      () => this.staffPayment.financeReject(req.id, this.rejectReason.trim()),
      'Request rejected',
    );
  }

  markPaid(): void {
    const req = this.request();
    if (!req) return;
    this.confirm
      .open({
        title: 'Mark as Paid',
        message: `Disburse ${formatCurrency(req.amount, req.currency_code)} for ${req.request_number}?`,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.runAction(
          () => this.staffPayment.markPaid(req.id, this.paymentReference),
          req.request_type === 'REIMBURSEMENT'
            ? 'Payment disbursed — view this record anytime under History'
            : 'Advance disbursed — liquidation due; closed records appear under History',
        );
      });
  }

  onLiquidationFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.liquidationFiles = input.files ? Array.from(input.files) : [];
  }

  onGlAccountSelected(value: number | string | null): void {
    this.glAccountId = value != null ? Number(value) : null;
  }

  submitLiquidation(): void {
    const req = this.request();
    if (!req) return;
    if (req.category_detail?.requires_receipt && !this.liquidationFiles.length) {
      this.notification.error('At least one receipt is required.');
      return;
    }
    this.runAction(
      () =>
        this.staffPayment.submitLiquidation(req.id, this.liquidationNotes, this.liquidationFiles),
      'Liquidation submitted',
    );
  }

  approveLiquidation(): void {
    const req = this.request();
    if (!req) return;
    this.runAction(
      () => this.staffPayment.approveLiquidation(req.id),
      'Liquidation approved — record archived under History',
    );
  }

  rejectLiquidation(): void {
    const req = this.request();
    if (!req || !this.rejectReason.trim()) {
      this.notification.error('Rejection reason is required.');
      return;
    }
    this.runAction(
      () => this.staffPayment.rejectLiquidation(req.id, this.rejectReason.trim()),
      'Liquidation rejected',
    );
  }

  private runAction(action: () => ReturnType<StaffPaymentService['hodApprove']>, successMsg: string): void {
    this.saving.set(true);
    action()
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => {
          this.notification.success(successMsg);
          this.request.set(updated);
          this.rejectReason = '';
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
