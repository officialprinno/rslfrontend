import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Account } from '../../../../core/models/finance.model';
import { PaymentRequestCategory } from '../../../../core/models/staff-payment.model';
import { PaginatedData } from '../../../../core/models/paginated.model';
import { AuthService } from '../../../../core/services/auth.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { StaffPaymentService } from '../../../../core/services/staff-payment.service';
import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { StaffPaymentSubnavComponent } from '../../components/staff-payment-subnav/staff-payment-subnav.component';
import { canManagePaymentCategories } from '../../utils/staff-payment-permissions.util';

@Component({
  selector: 'app-staff-payment-categories',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    FinanceNavComponent,
    StaffPaymentSubnavComponent,
    TableSkeletonComponent,
    EmptyStateComponent,
    ModalComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './staff-payment-categories.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffPaymentCategoriesComponent implements OnInit {
  private readonly staffPayment = inject(StaffPaymentService);
  private readonly finance = inject(FinanceService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly categories = signal<PaymentRequestCategory[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showModal = signal(false);
  readonly editing = signal<PaymentRequestCategory | null>(null);
  readonly glOptions = signal<SelectOption[]>([]);
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly formatCurrency = formatCurrency;
  readonly canManage = () => canManagePaymentCategories(this.auth);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    spending_limit: [null as number | null],
    requires_receipt: [true],
    gl_account: [null as number | null],
    sort_order: [0],
    is_active: [true],
  });

  ngOnInit(): void {
    this.load();
    this.finance.getAccounts({ account_type: 'EXPENSE', is_active: true }).subscribe({
      next: (data) => {
        const rows = Array.isArray(data) ? data : (data as PaginatedData<Account>).results ?? [];
        this.glOptions.set(
          rows.map((a) => ({
            value: a.id,
            label: `${a.account_code} — ${a.account_name || a.name}`,
          })),
        );
      },
    });
  }

  load(): void {
    this.loading.set(true);
    this.staffPayment
      .loadCategories()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (cats) => this.categories.set(cats),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openCreate(): void {
    this.editing.set(null);
    this.fieldErrors.set({});
    this.form.reset({
      name: '',
      description: '',
      spending_limit: null,
      requires_receipt: true,
      gl_account: null,
      sort_order: 0,
      is_active: true,
    });
    this.showModal.set(true);
  }

  openEdit(cat: PaymentRequestCategory): void {
    this.editing.set(cat);
    this.fieldErrors.set({});
    this.form.reset({
      name: cat.name,
      description: cat.description,
      spending_limit: cat.spending_limit ? Number(cat.spending_limit) : null,
      requires_receipt: cat.requires_receipt,
      gl_account: cat.gl_account,
      sort_order: cat.sort_order,
      is_active: cat.is_active,
    });
    this.showModal.set(true);
  }

  onGlAccountSelected(value: number | string | null): void {
    this.form.controls.gl_account.setValue(value != null ? Number(value) : null);
  }

  save(): void {
    if (this.form.invalid || !this.canManage()) return;
    this.saving.set(true);
    this.fieldErrors.set({});
    const v = this.form.getRawValue();
    const payload = {
      name: v.name!,
      description: v.description || '',
      spending_limit: v.spending_limit != null ? String(v.spending_limit) : null,
      requires_receipt: !!v.requires_receipt,
      gl_account: v.gl_account,
      sort_order: v.sort_order ?? 0,
      is_active: !!v.is_active,
    };
    const edit = this.editing();
    const req = edit
      ? this.staffPayment.updateCategory(edit.id, payload)
      : this.staffPayment.createCategory(payload);

    req.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notification.success(edit ? 'Category updated' : 'Category created');
        this.showModal.set(false);
        this.load();
      },
      error: (e) => {
        this.fieldErrors.set(extractFieldErrors(e));
        this.notification.error(getApiErrorMessage(e));
      },
    });
  }
}
