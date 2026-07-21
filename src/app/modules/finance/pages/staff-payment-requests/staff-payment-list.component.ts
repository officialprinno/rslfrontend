import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  PaymentRequestCategory,
  StaffPaymentQueue,
  StaffPaymentRequest,
} from '../../../../core/models/staff-payment.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { StaffPaymentService } from '../../../../core/services/staff-payment.service';
import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { StaffPaymentSubnavComponent } from '../../components/staff-payment-subnav/staff-payment-subnav.component';
import { canCreateStaffPayment } from '../../utils/staff-payment-permissions.util';

const QUEUE_META: Record<
  StaffPaymentQueue,
  { title: string; subtitle: string; allowCreate: boolean }
> = {
  my: {
    title: 'My Payment Requests',
    subtitle: 'Submit an advance or reimbursement for manager and Finance approval',
    allowCreate: true,
  },
  hod: {
    title: 'HOD Approval Queue',
    subtitle: 'Department payment requests awaiting your approval',
    allowCreate: false,
  },
  gm: {
    title: 'GM Approval Queue',
    subtitle: 'Escalated or HOD/Finance submissions awaiting GM sign-off',
    allowCreate: false,
  },
  finance: {
    title: 'Finance Approval Queue',
    subtitle: 'Select GL account and approve payment requests',
    allowCreate: false,
  },
  payment: {
    title: 'Payment Queue',
    subtitle: 'Approved requests ready for disbursement. After payment, find them under History.',
    allowCreate: false,
  },
  liquidation: {
    title: 'Liquidation Queue',
    subtitle: 'Advance liquidations awaiting Finance review',
    allowCreate: false,
  },
  history: {
    title: 'Completed Payment Requests',
    subtitle: 'Closed and rejected requests kept for audit reference',
    allowCreate: false,
  },
  all: {
    title: 'All Payment Requests',
    subtitle: 'Full register of staff advances and reimbursements',
    allowCreate: false,
  },
};

@Component({
  selector: 'app-staff-payment-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    StaffPaymentSubnavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
    ModalComponent,
  ],
  templateUrl: './staff-payment-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffPaymentListComponent implements OnInit {
  private readonly staffPayment = inject(StaffPaymentService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly queue = signal<StaffPaymentQueue>('my');
  readonly employeePortal = signal(false);
  readonly meta = computed(() => QUEUE_META[this.queue()]);
  readonly detailBasePath = computed(() =>
    this.employeePortal() ? '/my-payment-requests' : '/finance/staff-payment-requests',
  );
  readonly requests = signal<StaffPaymentRequest[]>([]);
  readonly categories = signal<PaymentRequestCategory[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showCreate = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly selectedFiles = signal<File[]>([]);
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly canCreate = () => canCreateStaffPayment(this.auth);
  readonly showSubmitCta = () => this.meta().allowCreate && this.canCreate();
  readonly showHistoryNav = () => this.employeePortal();
  readonly showJournalColumn = () =>
    this.queue() === 'history' || this.queue() === 'all' || this.queue() === 'my';

  readonly emptyStateHint = computed(() => {
    if (this.queue() === 'payment') {
      return 'Completed disbursements are kept under History for audit reference.';
    }
    if (this.queue() === 'liquidation') {
      return 'Fully liquidated advances appear under History once closed.';
    }
    return '';
  });

  readonly statusFilter = signal('');

  readonly selectedCategory = computed(() => {
    const id = this.form.controls.category_id.value;
    return this.categories().find((c) => c.id === id) ?? null;
  });

  readonly escalationWarning = computed(() => {
    const cat = this.selectedCategory();
    const amount = Number(this.form.controls.amount.value || 0);
    if (!cat?.spending_limit) return '';
    const limit = Number(cat.spending_limit);
    if (amount > limit) {
      return `Amount exceeds category limit (${formatCurrency(limit, 'TZS')}) — GM approval will be required.`;
    }
    return '';
  });

  readonly form = this.fb.group({
    request_type: ['REIMBURSEMENT' as 'ADVANCE' | 'REIMBURSEMENT', Validators.required],
    category_id: [null as number | null, Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    activity_date: [new Date().toISOString().slice(0, 10), Validators.required],
    payment_method: ['CASH' as 'CASH' | 'BANK_TRANSFER', Validators.required],
    bank_account_details: [''],
    purpose: ['', Validators.required],
  });

  ngOnInit(): void {
    const q = (this.route.snapshot.data['queue'] as StaffPaymentQueue) ?? 'my';
    this.queue.set(q);
    this.employeePortal.set(!!this.route.snapshot.data['employeePortal']);
    if (this.meta().allowCreate) {
      this.staffPayment.loadCategories().subscribe({
        next: (cats) => this.categories.set(cats),
        error: () => this.categories.set([]),
      });
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 20,
      queue: this.queue(),
    };
    if (this.statusFilter()) {
      params['overall_status'] = this.statusFilter();
    }
    this.staffPayment
      .getRequests(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.requests.set(data.results);
          this.total.set(data.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  setQueue(queue: StaffPaymentQueue): void {
    this.queue.set(queue);
    this.statusFilter.set('');
    this.page.set(1);
    this.load();
  }

  openCreate(): void {
    this.fieldErrors.set({});
    this.selectedFiles.set([]);
    this.form.reset({
      request_type: 'REIMBURSEMENT',
      category_id: null,
      amount: null,
      activity_date: new Date().toISOString().slice(0, 10),
      payment_method: 'CASH',
      bank_account_details: '',
      purpose: '',
    });
    this.showCreate.set(true);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles.set(input.files ? Array.from(input.files) : []);
  }

  submitCreate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const cat = this.selectedCategory();
    const files = this.selectedFiles();
    if (cat?.requires_receipt && this.form.value.request_type === 'REIMBURSEMENT' && !files.length) {
      this.notification.error('At least one receipt is required for this category.');
      return;
    }

    this.saving.set(true);
    this.fieldErrors.set({});
    const v = this.form.getRawValue();
    this.staffPayment
      .createRequest({
        request_type: v.request_type!,
        category_id: v.category_id!,
        amount: Number(v.amount),
        activity_date: v.activity_date!,
        payment_method: v.payment_method!,
        bank_account_details: v.bank_account_details || '',
        purpose: v.purpose!,
        attachments: files,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Payment request submitted');
          this.showCreate.set(false);
          this.page.set(1);
          this.load();
        },
        error: (e) => {
          this.fieldErrors.set(extractFieldErrors(e));
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }
}
