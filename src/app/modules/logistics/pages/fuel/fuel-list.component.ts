import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Driver, FuelRecord, FuelSummary, Vehicle } from '../../../../core/models/logistics.model';
import { AuthService } from '../../../../core/services/auth.service';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';
import { canRecordFuel } from '../../utils/logistics-permissions.util';

@Component({
  selector: 'app-fuel-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    LogisticsNavComponent,
    PaginationComponent,
    ModalComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './fuel-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuelListComponent implements OnInit {
  private readonly logistics = inject(LogisticsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly records = signal<FuelRecord[]>([]);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly drivers = signal<Driver[]>([]);
  readonly summary = signal<FuelSummary | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly showRecord = signal(false);

  readonly formatDate = formatDate;
  readonly formatCurrency = formatCurrency;
  readonly formatNumber = formatNumber;
  readonly canRecord = () => canRecordFuel(this.auth);

  readonly recordForm = this.fb.group({
    vehicle: [null as number | null, Validators.required],
    driver: [null as number | null],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    liters: [0, Validators.required],
    cost_per_liter: [0, Validators.required],
    odometer_reading: [0, Validators.required],
    station_name: [''],
    notes: [''],
  });

  readonly totalCostPreview = computed(() => {
    const raw = this.recordFormValue();
    return Number(raw.liters) * Number(raw.cost_per_liter);
  });

  private readonly recordFormValue = signal(this.recordForm.getRawValue());

  ngOnInit(): void {
    this.recordForm.valueChanges.subscribe(() =>
      this.recordFormValue.set(this.recordForm.getRawValue()),
    );
    this.logistics.getVehicles({ page_size: 100, is_active: true }).subscribe((d) => this.vehicles.set(d.results));
    this.logistics.getDrivers({ page_size: 100 }).subscribe((d) => this.drivers.set(d.results));
    this.loadSummary();
    this.load();
  }

  loadSummary(): void {
    this.logistics.getFuelSummary().subscribe({
      next: (s) => this.summary.set(s),
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 10,
      ordering: '-date',
    };
    if (this.search()) params['search'] = this.search();

    this.logistics
      .getFuelRecords(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.records.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openRecord(): void {
    this.recordForm.reset({
      date: new Date().toISOString().slice(0, 10),
      liters: 0,
      cost_per_liter: 0,
      odometer_reading: 0,
    });
    this.recordFormValue.set(this.recordForm.getRawValue());
    this.showRecord.set(true);
  }

  saveRecord(): void {
    if (this.recordForm.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.recordForm.getRawValue();
    this.saving.set(true);
    this.logistics
      .recordFueling({
        vehicle: raw.vehicle!,
        driver: raw.driver,
        date: raw.date!,
        liters: Number(raw.liters),
        cost_per_liter: Number(raw.cost_per_liter),
        odometer_reading: Number(raw.odometer_reading),
        station_name: raw.station_name ?? '',
        notes: raw.notes ?? '',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Fuel record saved');
          this.showRecord.set(false);
          this.loadSummary();
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
