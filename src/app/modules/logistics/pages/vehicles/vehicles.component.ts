import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';

import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { finalize } from 'rxjs/operators';



import { Vehicle, VehicleFormData, VehicleStatus } from '../../../../core/models/logistics.model';

import { AuthService } from '../../../../core/services/auth.service';

import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

import { LogisticsService } from '../../../../core/services/logistics.service';

import { NotificationService } from '../../../../core/services/notification.service';

import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';

import { exportToExcel } from '../../../../core/utils/export.util';

import { formatCurrency, formatDate } from '../../../../core/utils/format.util';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';

import {

  MAINTENANCE_TYPES,

  VEHICLE_MAKES,

  VEHICLE_STATUSES,

  VEHICLE_STATUS_BORDER,

  VEHICLE_TYPES,

} from '../../constants/logistics.constants';

import {

  canDeleteAnything,

  canManageVehicles,

  canRecordFuel,

  canScheduleMaintenance,

} from '../../utils/logistics-permissions.util';



@Component({

  selector: 'app-vehicles',

  imports: [
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,

    PageHeaderComponent,

    LogisticsNavComponent,

    PaginationComponent,

    ModalComponent,

    EmptyStateComponent,

    ErrorStateComponent,

    StatusBadgeComponent,

  ],

  templateUrl: './vehicles.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class VehiclesComponent implements OnInit {

  private readonly logistics = inject(LogisticsService);

  private readonly auth = inject(AuthService);

  private readonly notification = inject(NotificationService);

  private readonly confirm = inject(ConfirmDialogService);

  private readonly router = inject(Router);

  private readonly fb = inject(FormBuilder);



  readonly vehicles = signal<Vehicle[]>([]);

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

  readonly showMaintenance = signal(false);

  readonly maintenanceVehicle = signal<Vehicle | null>(null);

  readonly editing = signal<Vehicle | null>(null);

  readonly fieldErrors = signal<Record<string, string>>({});



  readonly vehicleTypes = VEHICLE_TYPES;

  readonly vehicleStatuses = VEHICLE_STATUSES;

  readonly vehicleMakes = VEHICLE_MAKES;

  readonly maintenanceTypes = MAINTENANCE_TYPES;

  readonly statusBorder = VEHICLE_STATUS_BORDER;

  readonly formatCurrency = formatCurrency;

  readonly formatDate = formatDate;



  readonly canAdd = () => canManageVehicles(this.auth);

  readonly canDelete = () => canDeleteAnything(this.auth);

  readonly canMaintenance = () => canScheduleMaintenance(this.auth);

  readonly canFuel = () => canRecordFuel(this.auth);



  readonly statusLabel = computed(() => {

    const map = Object.fromEntries(VEHICLE_STATUSES.map((s) => [s.value, s.label]));

    return (status: VehicleStatus) => map[status] ?? status;

  });



  readonly typeLabel = computed(() => {

    const map = Object.fromEntries(VEHICLE_TYPES.map((t) => [t.value, t.label]));

    return (type: string) => map[type as keyof typeof map] ?? type;

  });



  readonly form = this.fb.group({

    registration_number: ['', Validators.required],

    make: ['', Validators.required],

    model: ['', Validators.required],

    year: [new Date().getFullYear(), [Validators.required, Validators.min(1990)]],

    vehicle_type: ['TRUCK' as VehicleFormData['vehicle_type'], Validators.required],

    capacity_kg: [0, [Validators.required, Validators.min(0)]],

    color: [''],

    status: ['AVAILABLE' as VehicleStatus, Validators.required],

    odometer_reading: [0, [Validators.required, Validators.min(0)]],

    current_location: [''],

    insurance_expiry: [''],

    road_licence_expiry: [''],

    last_service_date: [''],

    next_service_date: [''],

    is_active: [true],

  });



  readonly maintenanceForm = this.fb.group({

    maintenance_type: ['SERVICE' as const, Validators.required],

    description: ['', Validators.required],

    service_date: ['', Validators.required],

    performed_by: [''],

    notes: [''],

  });



  ngOnInit(): void {

    this.load();

  }



  load(): void {

    this.loading.set(true);

    this.error.set(false);

    const params: Record<string, string | number | boolean> = {

      page: this.page(),

      page_size: this.pageSize(),

      ordering: 'registration_number',

    };

    if (this.search()) params['search'] = this.search();

    if (this.typeFilter()) params['vehicle_type'] = this.typeFilter();

    if (this.statusFilter()) params['status'] = this.statusFilter();

    if (this.activeFilter() === 'active') params['is_active'] = true;

    if (this.activeFilter() === 'inactive') params['is_active'] = false;



    this.logistics

      .getVehicles(params)

      .pipe(finalize(() => this.loading.set(false)))

      .subscribe({

        next: (data) => {

          this.vehicles.set(data.results);

          this.total.set(data.count);

        },

        error: () => this.error.set(true),

      });

  }



  openAdd(): void {

    this.editing.set(null);

    this.fieldErrors.set({});

    this.form.reset({

      registration_number: '',

      make: '',

      model: '',

      year: new Date().getFullYear(),

      vehicle_type: 'TRUCK',

      capacity_kg: 0,

      color: '',

      status: 'AVAILABLE',

      odometer_reading: 0,

      current_location: '',

      insurance_expiry: '',

      road_licence_expiry: '',

      last_service_date: '',

      next_service_date: '',

      is_active: true,

    });

    this.showForm.set(true);

  }



  openEdit(v: Vehicle): void {

    this.editing.set(v);

    this.fieldErrors.set({});

    this.form.patchValue({

      registration_number: v.registration_number,

      make: v.make,

      model: v.model,

      year: v.year,

      vehicle_type: v.vehicle_type,

      capacity_kg: v.capacity_kg,

      color: v.color,

      status: v.status,

      odometer_reading: v.odometer_reading,

      current_location: v.current_location,

      insurance_expiry: v.insurance_expiry?.slice(0, 10) ?? '',

      road_licence_expiry: v.road_licence_expiry?.slice(0, 10) ?? '',

      last_service_date: v.last_service_date?.slice(0, 10) ?? '',

      next_service_date: v.next_service_date?.slice(0, 10) ?? '',

      is_active: v.is_active,

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

    const data: VehicleFormData = {

      registration_number: (raw.registration_number ?? '').trim().toUpperCase(),

      make: raw.make ?? '',

      model: raw.model ?? '',

      year: Number(raw.year),

      vehicle_type: raw.vehicle_type ?? 'TRUCK',

      capacity_kg: Number(raw.capacity_kg),

      color: raw.color ?? '',

      status: raw.status ?? 'AVAILABLE',

      odometer_reading: Number(raw.odometer_reading),

      current_location: raw.current_location ?? '',

      insurance_expiry: raw.insurance_expiry || undefined,

      road_licence_expiry: raw.road_licence_expiry || undefined,

      last_service_date: raw.last_service_date || undefined,

      next_service_date: raw.next_service_date || undefined,

      is_active: raw.is_active ?? true,

    };

    this.saving.set(true);

    const edit = this.editing();

    const req$ = edit

      ? this.logistics.updateVehicle(edit.id, data)

      : this.logistics.createVehicle(data);

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({

      next: () => {

        this.notification.success(edit ? 'Vehicle updated' : 'Vehicle registered');

        this.showForm.set(false);

        this.load();

      },

      error: (err) => {

        const httpErr = err as { error?: { errors?: unknown } };

        if (httpErr.error?.errors) this.fieldErrors.set(extractFieldErrors(httpErr.error.errors as never));

        this.notification.error(getApiErrorMessage(err, 'Failed to save vehicle'));

      },

    });

  }



  onDelete(v: Vehicle): void {

    this.confirm

      .open({

        title: 'Delete Vehicle',

        message: `Remove "${v.registration_number}" from the fleet?`,

        confirmLabel: 'Delete',

        confirmDanger: true,

      })

      .subscribe((ok) => {

        if (!ok) return;

        this.logistics.deleteVehicle(v.id).subscribe({

          next: () => {

            this.notification.success('Vehicle removed');

            this.load();

          },

          error: (e) => this.notification.error(getApiErrorMessage(e, 'Delete failed')),

        });

      });

  }



  openScheduleMaintenance(v: Vehicle): void {

    this.maintenanceVehicle.set(v);

    this.maintenanceForm.reset({

      maintenance_type: 'SERVICE',

      description: '',

      service_date: new Date().toISOString().slice(0, 10),

      performed_by: '',

      notes: '',

    });

    this.showMaintenance.set(true);

  }



  onScheduleMaintenance(): void {

    if (this.maintenanceForm.invalid) {

      this.maintenanceForm.markAllAsTouched();

      this.notification.error('Please complete maintenance details.');

      return;

    }

    const v = this.maintenanceVehicle();

    if (!v) return;

    const raw = this.maintenanceForm.getRawValue();

    this.saving.set(true);

    this.logistics

      .scheduleMaintenance({

        vehicle: v.id,

        maintenance_type: raw.maintenance_type ?? 'SERVICE',

        description: (raw.description ?? '').trim(),

        service_date: raw.service_date ?? '',

        performed_by: raw.performed_by ?? '',

        notes: raw.notes ?? '',

      })

      .pipe(finalize(() => this.saving.set(false)))

      .subscribe({

        next: () => {

          this.notification.success('Maintenance scheduled');

          this.showMaintenance.set(false);

        },

        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to schedule maintenance')),

      });

  }



  recordFuel(v: Vehicle): void {

    this.router.navigate(['/logistics/fuel'], { queryParams: { vehicle: v.id } });

  }



  viewHistory(v: Vehicle): void {

    this.router.navigate(['/logistics/vehicles', v.id], { queryParams: { tab: 'trips' } });

  }



  exportExcel(): void {

    exportToExcel('vehicles', [

      { key: 'registration_number', label: 'Registration' },

      { key: 'make', label: 'Make' },

      { key: 'model', label: 'Model' },

      { key: 'year', label: 'Year' },

      { key: 'vehicle_type', label: 'Type' },

      { key: 'status', label: 'Status' },

      { key: 'capacity_kg', label: 'Capacity (kg)' },

      { key: 'odometer_reading', label: 'Odometer' },

      { key: 'current_location', label: 'Location' },

      { key: 'insurance_expiry', label: 'Insurance Expiry' },

      { key: 'road_licence_expiry', label: 'Licence Expiry' },

    ], this.vehicles());

  }

}


