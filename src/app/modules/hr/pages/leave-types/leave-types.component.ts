import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { LeaveType, LeaveTypeFormData } from '../../../../core/models/hr.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { HrNavComponent } from '../../components/hr-nav/hr-nav.component';
import { canManageLeaveTypes } from '../../utils/hr-permissions.util';

@Component({
  selector: 'app-leave-types',
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
  templateUrl: './leave-types.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveTypesComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  readonly items = signal<LeaveType[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly search = signal('');
  readonly showForm = signal(false);
  readonly editing = signal<LeaveType | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly canManage = () => canManageLeaveTypes(this.auth);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    days_entitled: [0, [Validators.required, Validators.min(0)]],
    is_paid: [true],
    carry_forward: [false],
    description: [''],
  });

  ngOnInit(): void {
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
      .getLeaveTypes(params)
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
      code: '',
      days_entitled: 0,
      is_paid: true,
      carry_forward: false,
      description: '',
    });
    this.showForm.set(true);
  }

  openEdit(item: LeaveType): void {
    this.editing.set(item);
    this.fieldErrors.set({});
    this.form.patchValue({
      name: item.name,
      code: item.code,
      days_entitled: item.days_entitled,
      is_paid: item.is_paid,
      carry_forward: item.carry_forward,
      description: item.description,
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
    const data: LeaveTypeFormData = {
      name: (raw.name ?? '').trim(),
      code: (raw.code ?? '').trim().toUpperCase(),
      days_entitled: Number(raw.days_entitled ?? 0),
      is_paid: raw.is_paid ?? true,
      carry_forward: raw.carry_forward ?? false,
      description: raw.description ?? '',
    };
    this.saving.set(true);
    const edit = this.editing();
    const req$ = edit
      ? this.hr.updateLeaveType(edit.id, data)
      : this.hr.createLeaveType(data);
    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notification.success(edit ? 'Leave type updated' : 'Leave type created');
        this.showForm.set(false);
        this.load();
      },
      error: (err) => {
        const httpErr = err as { error?: { errors?: unknown } };
        if (httpErr.error?.errors) {
          this.fieldErrors.set(extractFieldErrors(httpErr.error.errors as never));
        }
        this.notification.error(getApiErrorMessage(err, 'Failed to save leave type'));
      },
    });
  }

  onDelete(item: LeaveType): void {
    this.confirm
      .open({
        title: 'Deactivate Leave Type',
        message: `Deactivate "${item.name}"?`,
        confirmLabel: 'Deactivate',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.hr.deleteLeaveType(item.id).subscribe({
          next: () => {
            this.notification.success('Leave type deactivated');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e, 'Delete failed')),
        });
      });
  }
}
