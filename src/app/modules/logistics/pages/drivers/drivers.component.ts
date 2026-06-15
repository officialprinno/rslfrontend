import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { finalize } from 'rxjs/operators';



import { Driver, DriverFormData, LicenseClass } from '../../../../core/models/logistics.model';

import { AuthService } from '../../../../core/services/auth.service';

import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

import { LogisticsService } from '../../../../core/services/logistics.service';

import { NotificationService } from '../../../../core/services/notification.service';

import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';

import { exportToExcel } from '../../../../core/utils/export.util';

import { formatDate } from '../../../../core/utils/format.util';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';

import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';

import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';

import { LICENSE_CLASSES } from '../../constants/logistics.constants';

import { canDeleteAnything, canManageDrivers } from '../../utils/logistics-permissions.util';



@Component({

  selector: 'app-drivers',

  imports: [

    FormsModule,

    ReactiveFormsModule,

    PageHeaderComponent,

    LogisticsNavComponent,

    PaginationComponent,

    ModalComponent,

    EmptyStateComponent,

    ErrorStateComponent,

    TableSkeletonComponent,

    StatusBadgeComponent,

    SearchableSelectComponent,

  ],

  templateUrl: './drivers.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class DriversComponent implements OnInit {

  private readonly logistics = inject(LogisticsService);

  private readonly auth = inject(AuthService);

  private readonly notification = inject(NotificationService);

  private readonly confirm = inject(ConfirmDialogService);

  private readonly fb = inject(FormBuilder);



  readonly drivers = signal<Driver[]>([]);

  readonly employeeOptions = signal<{ id: number; full_name: string; employee_number: string; department_name: string; work_email: string }[]>([]);

  readonly loading = signal(true);

  readonly error = signal(false);

  readonly saving = signal(false);

  readonly total = signal(0);

  readonly page = signal(1);

  readonly pageSize = signal(10);

  readonly search = signal('');

  readonly availabilityFilter = signal<'all' | 'available' | 'unavailable'>('all');

  readonly activeFilter = signal<'all' | 'active' | 'inactive'>('all');

  readonly showForm = signal(false);

  readonly showView = signal(false);

  readonly editing = signal<Driver | null>(null);

  readonly viewing = signal<Driver | null>(null);

  readonly fieldErrors = signal<Record<string, string>>({});



  readonly licenseClasses = LICENSE_CLASSES;

  readonly formatDate = formatDate;



  readonly canAdd = () => canManageDrivers(this.auth);

  readonly canDelete = () => canDeleteAnything(this.auth);



  readonly form = this.fb.group({

    employee: [null as number | null, Validators.required],

    license_number: ['', Validators.required],

    license_class: ['B' as LicenseClass, Validators.required],

    license_expiry: ['', Validators.required],

    medical_expiry: ['', Validators.required],

    is_available: [true],

  });



  ngOnInit(): void {

    this.load();

  }



  loadEligibleEmployees(): void {

    this.logistics.getEligibleDriverEmployees().subscribe({

      next: (list) => this.employeeOptions.set(list),

      error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to load employees')),

    });

  }



  load(): void {

    this.loading.set(true);

    this.error.set(false);

    const params: Record<string, string | number | boolean> = {

      page: this.page(),

      page_size: this.pageSize(),

      ordering: 'full_name',

    };

    if (this.search()) params['search'] = this.search();

    if (this.availabilityFilter() === 'available') params['is_available'] = true;

    if (this.availabilityFilter() === 'unavailable') params['is_available'] = false;

    if (this.activeFilter() === 'active') params['is_active'] = true;

    if (this.activeFilter() === 'inactive') params['is_active'] = false;



    this.logistics

      .getDrivers(params)

      .pipe(finalize(() => this.loading.set(false)))

      .subscribe({

        next: (data) => {

          this.drivers.set(data.results);

          this.total.set(data.count);

        },

        error: () => this.error.set(true),

      });

  }



  employeeSelectOptions() {

    return this.employeeOptions().map((e) => ({

      value: e.id,

      label: e.full_name,

      sublabel: [e.employee_number, e.department_name, e.work_email].filter(Boolean).join(' · '),

    }));

  }



  openAdd(): void {

    this.editing.set(null);

    this.fieldErrors.set({});

    this.form.controls.employee.setValidators(Validators.required);

    this.form.controls.employee.updateValueAndValidity();

    this.loadEligibleEmployees();

    this.form.reset({

      employee: null,

      license_number: '',

      license_class: 'B',

      license_expiry: '',

      medical_expiry: '',

      is_available: true,

    });

    this.showForm.set(true);

  }



  openEdit(d: Driver): void {

    this.editing.set(d);

    this.fieldErrors.set({});

    this.form.controls.employee.clearValidators();

    this.form.controls.employee.updateValueAndValidity();

    this.form.patchValue({

      license_number: d.license_number,

      license_class: d.license_class,

      license_expiry: d.license_expiry?.slice(0, 10) ?? '',

      medical_expiry: d.medical_expiry?.slice(0, 10) ?? '',

      is_available: d.is_available,

    });

    this.showForm.set(true);

  }



  openView(d: Driver): void {

    this.logistics.getDriver(d.id).subscribe({

      next: (full) => {

        this.viewing.set(full);

        this.showView.set(true);

      },

      error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to load driver')),

    });

  }



  onSubmit(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      this.notification.error('Please complete all required fields.');

      return;

    }

    const raw = this.form.getRawValue();

    const data: DriverFormData = {

      employee: raw.employee!,

      license_number: (raw.license_number ?? '').trim(),

      license_class: raw.license_class ?? 'B',

      license_expiry: raw.license_expiry ?? '',

      medical_expiry: raw.medical_expiry ?? '',

      is_available: raw.is_available ?? true,

    };

    this.saving.set(true);

    const edit = this.editing();

    const req$ = edit

      ? this.logistics.updateDriver(edit.id, {

          license_number: data.license_number,

          license_class: data.license_class,

          license_expiry: data.license_expiry,

          medical_expiry: data.medical_expiry,

          is_available: data.is_available,

        })

      : this.logistics.createDriver(data);

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({

      next: () => {

        this.notification.success(edit ? 'Driver updated' : 'Driver registered');

        this.showForm.set(false);

        this.load();

      },

      error: (err) => {

        const httpErr = err as { error?: { errors?: unknown } };

        if (httpErr.error?.errors) this.fieldErrors.set(extractFieldErrors(httpErr.error.errors as never));

        this.notification.error(getApiErrorMessage(err, 'Failed to save driver'));

      },

    });

  }



  onDelete(d: Driver): void {

    this.confirm

      .open({

        title: 'Delete Driver',

        message: `Remove driver "${d.full_name}"?`,

        confirmLabel: 'Delete',

        confirmDanger: true,

      })

      .subscribe((ok) => {

        if (!ok) return;

        this.logistics.deleteDriver(d.id).subscribe({

          next: () => {

            this.notification.success('Driver removed');

            this.load();

          },

          error: (e) => this.notification.error(getApiErrorMessage(e, 'Delete failed')),

        });

      });

  }



  exportExcel(): void {

    exportToExcel('drivers', [

      { key: 'full_name', label: 'Name' },

      { key: 'phone', label: 'Phone' },

      { key: 'license_number', label: 'Licence Number' },

      { key: 'license_class', label: 'Licence Class' },

      { key: 'license_expiry', label: 'Licence Expiry' },

      { key: 'medical_expiry', label: 'Medical Expiry' },

      { key: 'is_available', label: 'Available' },

      { key: 'total_trips', label: 'Total Trips' },

      { key: 'on_time_percent', label: 'On-Time %' },

    ], this.drivers());

  }



  expiryClass(date: string | null | undefined): string {

    if (!date) return 'text-gray-500';

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const expiry = new Date(date);

    expiry.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'text-red-600 font-semibold';

    if (diffDays <= 30) return 'text-orange-600 font-medium';

    return 'text-gray-900';

  }



  licenseClassLabel(value: LicenseClass): string {

    return LICENSE_CLASSES.find((c) => c.value === value)?.label ?? value;

  }



  setEmployee(value: number | string | null): void {

    this.form.controls.employee.setValue(typeof value === 'number' ? value : null);

  }

}


