import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Machine, MachineFormData, MachineStatus } from '../../../../core/models/production.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductionService } from '../../../../core/services/production.service';
import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ProductionNavComponent } from '../../components/production-nav/production-nav.component';
import {
  MACHINE_STATUSES,
  MACHINE_STATUS_BORDER,
  MACHINE_TYPES,
} from '../../constants/production.constants';
import {
  canManageMachines,
  canReportBreakdown,
} from '../../utils/production-permissions.util';

@Component({
  selector: 'app-machines',
  imports: [
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    ProductionNavComponent,
    PaginationComponent,
    ModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './machines.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MachinesComponent implements OnInit {
  private readonly production = inject(ProductionService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly machines = signal<Machine[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(12);
  readonly search = signal('');
  readonly typeFilter = signal('');
  readonly statusFilter = signal('');
  readonly activeFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly showForm = signal(false);
  readonly showBreakdown = signal(false);
  readonly breakdownMachine = signal<Machine | null>(null);
  readonly editing = signal<Machine | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly machineTypes = MACHINE_TYPES;
  readonly machineStatuses = MACHINE_STATUSES;
  readonly statusBorder = MACHINE_STATUS_BORDER;
  readonly formatDate = formatDate;
  readonly canAdd = () => canManageMachines(this.auth);
  readonly canBreakdown = () => canReportBreakdown(this.auth);

  readonly statusLabel = computed(() => {
    const map = Object.fromEntries(MACHINE_STATUSES.map((s) => [s.value, s.label]));
    return (status: MachineStatus) => map[status] ?? status;
  });

  readonly typeLabel = computed(() => {
    const map = Object.fromEntries(MACHINE_TYPES.map((t) => [t.value, t.label]));
    return (type: string) => map[type] ?? type;
  });

  readonly form = this.fb.group({
    machine_code: [''],
    name: ['', Validators.required],
    machine_type: ['WIRE_DRAWING', Validators.required],
    purchase_date: [''],
    status: ['ACTIVE' as MachineStatus, Validators.required],
    last_service_date: [''],
    next_service_date: [''],
    notes: [''],
    is_active: [true],
  });

  readonly breakdownForm = this.fb.group({
    notes: ['', Validators.required],
  });
  readonly breakdownPhoto = signal<File | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number | boolean> = {
      page: this.page(),
      page_size: this.pageSize(),
      ordering: 'machine_code',
    };
    if (this.search()) params['search'] = this.search();
    if (this.typeFilter()) params['machine_type'] = this.typeFilter();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.activeFilter() === 'active') params['is_active'] = true;
    if (this.activeFilter() === 'inactive') params['is_active'] = false;

    this.production
      .getMachines(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.machines.set(data.results);
          this.total.set(data.count);
        },
        error: () => this.error.set(true),
      });
  }

  openAdd(): void {
    this.editing.set(null);
    this.fieldErrors.set({});
    this.form.reset({
      machine_code: '',
      name: '',
      machine_type: 'WIRE_DRAWING',
      purchase_date: '',
      status: 'ACTIVE',
      last_service_date: '',
      next_service_date: '',
      notes: '',
      is_active: true,
    });
    this.showForm.set(true);
  }

  openEdit(m: Machine): void {
    this.editing.set(m);
    this.fieldErrors.set({});
    this.form.patchValue({
      machine_code: m.machine_code,
      name: m.name,
      machine_type: m.machine_type,
      purchase_date: m.purchase_date?.slice(0, 10) ?? '',
      status: m.status,
      last_service_date: m.last_service_date?.slice(0, 10) ?? '',
      next_service_date: m.next_service_date?.slice(0, 10) ?? '',
      notes: m.notes ?? '',
      is_active: m.is_active,
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
    const data: MachineFormData = {
      machine_code: raw.machine_code || undefined,
      name: (raw.name ?? '').trim(),
      machine_type: raw.machine_type ?? 'WIRE_DRAWING',
      purchase_date: raw.purchase_date || undefined,
      status: raw.status ?? 'ACTIVE',
      last_service_date: raw.last_service_date || undefined,
      next_service_date: raw.next_service_date || undefined,
      notes: raw.notes ?? '',
      is_active: raw.is_active ?? true,
    };
    this.saving.set(true);
    const edit = this.editing();
    const req$ = edit
      ? this.production.updateMachine(edit.id, data)
      : this.production.createMachine(data);
    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notification.success(edit ? 'Machine updated' : 'Machine added');
        this.showForm.set(false);
        this.load();
      },
      error: (err) => {
        const httpErr = err as { error?: { errors?: unknown } };
        if (httpErr.error?.errors) this.fieldErrors.set(extractFieldErrors(httpErr.error.errors as never));
        this.notification.error(getApiErrorMessage(err, 'Failed to save machine'));
      },
    });
  }

  openBreakdown(m: Machine): void {
    this.breakdownMachine.set(m);
    this.breakdownForm.reset({ notes: '' });
    this.breakdownPhoto.set(null);
    this.showBreakdown.set(true);
  }

  onBreakdownPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file && file.size > 10 * 1024 * 1024) {
      this.notification.error('Photo must be 10 MB or smaller.');
      input.value = '';
      this.breakdownPhoto.set(null);
      return;
    }
    this.breakdownPhoto.set(file);
  }

  submitBreakdown(): void {
    if (this.breakdownForm.invalid) {
      this.notification.error('Please describe the breakdown.');
      return;
    }
    const m = this.breakdownMachine();
    if (!m) return;
    this.saving.set(true);
    this.production
      .reportBreakdown(
        m.id,
        (this.breakdownForm.getRawValue().notes ?? '').trim(),
        this.breakdownPhoto(),
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Breakdown reported');
          this.showBreakdown.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to report breakdown')),
      });
  }

  viewDetail(m: Machine): void {
    void this.router.navigate(['/production/machines', m.id]);
  }
}
