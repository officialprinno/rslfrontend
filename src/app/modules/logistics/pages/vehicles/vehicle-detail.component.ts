import { DecimalPipe } from '@angular/common';

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';

import { finalize } from 'rxjs/operators';



import { Vehicle, VehicleHistory } from '../../../../core/models/logistics.model';

import { LogisticsService } from '../../../../core/services/logistics.service';

import { NotificationService } from '../../../../core/services/notification.service';

import { getApiErrorMessage } from '../../../../core/utils/api.util';

import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';

import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';

import { VEHICLE_STATUSES, VEHICLE_TYPES } from '../../constants/logistics.constants';



type VehicleTab = 'overview' | 'trips' | 'maintenance' | 'fuel';



type ComplianceLevel = 'ok' | 'warning' | 'expired';



@Component({

  selector: 'app-vehicle-detail',

  imports: [

    DecimalPipe,

    RouterLink,

    PageHeaderComponent,

    LogisticsNavComponent,

    EmptyStateComponent,

    ErrorStateComponent,

    TableSkeletonComponent,

    StatusBadgeComponent,

  ],

  templateUrl: './vehicle-detail.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class VehicleDetailComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);

  private readonly logistics = inject(LogisticsService);

  private readonly notification = inject(NotificationService);



  readonly vehicle = signal<Vehicle | null>(null);

  readonly history = signal<VehicleHistory | null>(null);

  readonly loading = signal(true);

  readonly historyLoading = signal(false);

  readonly error = signal(false);

  readonly activeTab = signal<VehicleTab>('overview');



  readonly formatCurrency = formatCurrency;

  readonly formatDate = formatDate;

  readonly formatDateTime = formatDateTime;



  readonly tabs: { id: VehicleTab; label: string }[] = [

    { id: 'overview', label: 'Overview' },

    { id: 'trips', label: 'Trip History' },

    { id: 'maintenance', label: 'Maintenance History' },

    { id: 'fuel', label: 'Fuel Records' },

  ];



  ngOnInit(): void {

    const tab = this.route.snapshot.queryParamMap.get('tab') as VehicleTab | null;

    if (tab && this.tabs.some((t) => t.id === tab)) {

      this.activeTab.set(tab);

    }

    this.loadVehicle();

  }



  vehicleId(): number {

    return +this.route.snapshot.paramMap.get('id')!;

  }



  loadVehicle(): void {

    this.loading.set(true);

    this.error.set(false);

    this.logistics

      .getVehicle(this.vehicleId())

      .pipe(finalize(() => this.loading.set(false)))

      .subscribe({

        next: (v) => {

          this.vehicle.set(v);

          if (this.activeTab() !== 'overview') this.loadHistory();

        },

        error: () => this.error.set(true),

      });

  }



  setTab(tab: VehicleTab): void {

    this.activeTab.set(tab);

    if (tab !== 'overview' && !this.history()) this.loadHistory();

  }



  loadHistory(): void {

    this.historyLoading.set(true);

    this.logistics

      .getVehicleHistory(this.vehicleId())

      .pipe(finalize(() => this.historyLoading.set(false)))

      .subscribe({

        next: (h) => this.history.set(h),

        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to load vehicle history')),

      });

  }



  typeLabel(type: string): string {

    return VEHICLE_TYPES.find((t) => t.value === type)?.label ?? type;

  }



  statusLabel(status: string): string {

    return VEHICLE_STATUSES.find((s) => s.value === status)?.label ?? status;

  }



  complianceLevel(date: string | null | undefined): ComplianceLevel {

    if (!date) return 'warning';

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const expiry = new Date(date);

    expiry.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'expired';

    if (diffDays <= 30) return 'warning';

    return 'ok';

  }



  complianceClass(level: ComplianceLevel): string {

    const map: Record<ComplianceLevel, string> = {

      ok: 'bg-emerald-50 text-emerald-800 border-emerald-200',

      warning: 'bg-orange-50 text-orange-800 border-orange-200',

      expired: 'bg-red-50 text-red-800 border-red-200',

    };

    return map[level];

  }



  complianceLabel(level: ComplianceLevel): string {

    const map: Record<ComplianceLevel, string> = {

      ok: 'Valid',

      warning: 'Expiring Soon',

      expired: 'Expired',

    };

    return map[level];

  }



  complianceDotClass(level: ComplianceLevel): string {

    const map: Record<ComplianceLevel, string> = {

      ok: 'bg-emerald-500',

      warning: 'bg-orange-500',

      expired: 'bg-red-500',

    };

    return map[level];

  }



  statTrips(v: Vehicle): number {

    return v.total_trips ?? this.history()?.stats?.total_trips ?? 0;

  }



  statKm(v: Vehicle): number {

    return v.total_km ?? this.history()?.stats?.total_km ?? 0;

  }



  statFuel(v: Vehicle): number {

    return v.fuel_this_month ?? this.history()?.stats?.fuel_this_month ?? 0;

  }



  hasTrips(): boolean {

    return (this.history()?.trips?.length ?? 0) > 0;

  }



  hasMaintenance(): boolean {

    return (this.history()?.maintenance?.length ?? 0) > 0;

  }



  hasFuel(): boolean {

    return (this.history()?.fuel?.length ?? 0) > 0;

  }

}


