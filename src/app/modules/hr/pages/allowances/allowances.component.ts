import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { AllowanceConfig, AllowanceFormData } from '../../../../core/models/hr.model';
import { Department } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { HrNavComponent } from '../../components/hr-nav/hr-nav.component';
import { canManageAllowances } from '../../utils/hr-permissions.util';

@Component({
  selector: 'app-allowances',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    HrNavComponent,
    ModalComponent,
    PaginationComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './allowances.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllowancesComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  readonly items = signal<AllowanceConfig[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly search = signal('');
  readonly showForm = signal(false);
  readonly editing = signal<AllowanceConfig | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly canManage = () => canManageAllowances(this.auth);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    amount: ['0', Validators.required],
    is_taxable: [true],
    department: [null as number | null],
    effective_date: ['', Validators.required],
    end_date: [''],
  });

  ngOnInit(): void {
    this.departmentsService.getDepartments().subscribe((d) => this.departments.set(d));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: this.pageSize(),
      ordering: 'name',
    };
    if (this.search()) params['search'] = this.search();

    this.hr
      .getAllowances(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.items.set(data.results);
          this.total.set(data.count);
        },
        error: () => this.error.set(true),
      });
  }

  openAdd(): void {
    this.editing.set(null);
    this.fieldErrors.set({});
    this.form.reset({
      name: '',
      amount: '0',
      is_taxable: true,
      department: null,
      effective_date: new Date().toISOString().slice(0, 10),
      end_date: '',
    });
    this.showForm.set(true);
  }

  openEdit(item: AllowanceConfig): void {
    this.editing.set(item);
    this.fieldErrors.set({});
    this.form.patchValue({
      name: item.name,
      amount: item.amount,
      is_taxable: item.is_taxable,
      department: item.department,
      effective_date: item.effective_date?.slice(0, 10) ?? '',
      end_date: item.end_date?.slice(0, 10) ?? '',
    });
    this.showForm.set(true);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Please complete all required fields.');
      return;
    }
    const raw = this.form.getRawValue();
    const data: AllowanceFormData = {
      name: (raw.name ?? '').trim(),
      amount: String(raw.amount ?? '0'),
      is_taxable: raw.is_taxable ?? true,
      department: raw.department,
      effective_date: raw.effective_date ?? '',
      end_date: raw.end_date || null,
    };
    this.saving.set(true);
    const edit = this.editing();
    const req$ = edit
      ? this.hr.updateAllowance(edit.id, data)
      : this.hr.createAllowance(data);
    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notification.success(edit ? 'Allowance updated' : 'Allowance created');
        this.showForm.set(false);
        this.load();
      },
      error: (err) => {
        const httpErr = err as { error?: { errors?: unknown } };
        if (httpErr.error?.errors) {
          this.fieldErrors.set(extractFieldErrors(httpErr.error.errors as never));
        }
        this.notification.error(getApiErrorMessage(err, 'Failed to save allowance'));
      },
    });
  }

  onDelete(item: AllowanceConfig): void {
    this.confirm
      .open({
        title: 'Deactivate Allowance',
        message: `Deactivate "${item.name}"?`,
        confirmLabel: 'Deactivate',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.hr.deleteAllowance(item.id).subscribe({
          next: () => {
            this.notification.success('Allowance deactivated');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e, 'Delete failed')),
        });
      });
  }
}
