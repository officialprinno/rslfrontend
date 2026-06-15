import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Vehicle, VehicleMaintenance } from '../../../../core/models/logistics.model';
import { MaintenanceFormData } from '../../../../core/models/logistics.model';
import { AuthService } from '../../../../core/services/auth.service';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';
import { MAINTENANCE_TYPES } from '../../constants/logistics.constants';
import { canScheduleMaintenance } from '../../utils/logistics-permissions.util';

@Component({
  selector: 'app-maintenance-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    LogisticsNavComponent,
    PaginationComponent,
    ModalComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './maintenance-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceListComponent implements OnInit {
  private readonly logistics = inject(LogisticsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly records = signal<VehicleMaintenance[]>([]);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly upcomingOnly = signal(false);
  readonly showSchedule = signal(false);
  readonly showComplete = signal(false);
  readonly completing = signal<VehicleMaintenance | null>(null);

  readonly maintenanceTypes = MAINTENANCE_TYPES;
  readonly formatDate = formatDate;
  readonly formatCurrency = formatCurrency;
  readonly canSchedule = () => canScheduleMaintenance(this.auth);

  readonly scheduleForm = this.fb.group({
    vehicle: [null as number | null, Validators.required],
    maintenance_type: ['SERVICE' as const, Validators.required],
    description: ['', Validators.required],
    service_date: ['', Validators.required],
    cost: [0],
    next_service_date: [''],
    performed_by: [''],
    notes: [''],
  });

  readonly completeForm = this.fb.group({
    service_date: ['', Validators.required],
    cost: [0, Validators.required],
    next_service_date: [''],
    work_done: [''],
    parts_replaced: [''],
    odometer_reading: [null as number | null],
  });

  ngOnInit(): void {
    this.logistics.getVehicles({ page_size: 100, is_active: true }).subscribe((d) => this.vehicles.set(d.results));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number | boolean> = {
      page: this.page(),
      page_size: 10,
      ordering: '-service_date',
    };
    if (this.search()) params['search'] = this.search();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.upcomingOnly()) params['upcoming'] = true;

    this.logistics
      .getMaintenance(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.records.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openSchedule(): void {
    this.scheduleForm.reset({
      maintenance_type: 'SERVICE',
      service_date: new Date().toISOString().slice(0, 10),
      cost: 0,
    });
    this.showSchedule.set(true);
  }

  submitSchedule(): void {
    if (this.scheduleForm.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.scheduleForm.getRawValue();
    const payload: MaintenanceFormData = {
      vehicle: raw.vehicle!,
      maintenance_type: raw.maintenance_type!,
      description: raw.description!,
      service_date: raw.service_date!,
      cost: Number(raw.cost) || undefined,
      next_service_date: raw.next_service_date || undefined,
      performed_by: raw.performed_by || undefined,
      notes: raw.notes || undefined,
    };
    this.saving.set(true);
    this.logistics
      .scheduleMaintenance(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Maintenance scheduled');
          this.showSchedule.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openComplete(record: VehicleMaintenance): void {
    this.completing.set(record);
    this.completeForm.reset({
      service_date: new Date().toISOString().slice(0, 10),
      cost: record.cost || 0,
      next_service_date: record.next_service_date?.slice(0, 10) ?? '',
      work_done: record.work_done ?? '',
      parts_replaced: record.parts_replaced ?? '',
      odometer_reading: record.odometer_reading ?? null,
    });
    this.showComplete.set(true);
  }

  submitComplete(): void {
    const record = this.completing();
    if (!record || this.completeForm.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.completeForm.getRawValue();
    this.saving.set(true);
    this.logistics
      .completeMaintenance(record.id, {
        service_date: raw.service_date!,
        cost: Number(raw.cost),
        next_service_date: raw.next_service_date || undefined,
        work_done: raw.work_done || undefined,
        parts_replaced: raw.parts_replaced || undefined,
        odometer_reading: raw.odometer_reading != null ? Number(raw.odometer_reading) : undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Maintenance completed');
          this.showComplete.set(false);
          this.completing.set(null);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
