import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  GrnDestinationHint,
  InternalRoute,
  InternalRouteType,
  InternalRouteWarning,
} from '../../../../core/models/internal-route.model';
import { PurchaseOrder } from '../../../../core/models/procurement.model';
import { Warehouse } from '../../../../core/models/inventory.model';
import { Driver, Vehicle } from '../../../../core/models/logistics.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyContextService } from '../../../../core/services/company-context.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';
import {
  canFilterInternalRoutesByCompany,
  canManageInternalRoutes,
} from '../../utils/logistics-permissions.util';

type ModalMode = 'create' | 'edit' | 'view' | 'addPo' | 'cancel' | null;

@Component({
  selector: 'app-internal-routes-list',
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
  templateUrl: './internal-routes-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InternalRoutesListComponent implements OnInit {
  private readonly logistics = inject(LogisticsService);
  private readonly procurement = inject(ProcurementService);
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly companyContext = inject(CompanyContextService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  readonly routes = signal<InternalRoute[]>([]);
  readonly activeRoutes = signal<InternalRoute[]>([]);
  readonly drivers = signal<Driver[]>([]);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly purchaseOrders = signal<PurchaseOrder[]>([]);
  readonly grnHints = signal<GrnDestinationHint[]>([]);
  readonly selectedRoute = signal<InternalRoute | null>(null);
  readonly modalMode = signal<ModalMode>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);

  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly routeTypeFilter = signal('');
  readonly driverFilter = signal('');
  readonly vehicleFilter = signal('');
  readonly companyFilter = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');

  readonly selectedPoIds = signal<number[]>([]);
  readonly addPoId = signal<number | null>(null);
  readonly cancelReason = signal('');

  readonly formatDate = formatDate;
  readonly canManage = () => canManageInternalRoutes(this.auth);
  readonly canFilterCompany = () => canFilterInternalRoutesByCompany(this.auth);

  readonly statusOptions = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  readonly routeTypeOptions: { value: InternalRouteType; label: string }[] = [
    { value: 'WAREHOUSE_TRANSFER', label: 'Warehouse Transfer' },
    { value: 'PO_PICKUP', label: 'PO Pickup' },
    { value: 'CUSTOM', label: 'Custom Route' },
  ];

  readonly userCompanies = computed(() => {
    const fromContext = this.companyContext.companies();
    if (fromContext.length) return fromContext;
    return this.auth.currentUser()?.companies ?? [];
  });

  readonly routeForm = this.fb.group({
    company: [null as number | null, Validators.required],
    route_type: ['WAREHOUSE_TRANSFER' as InternalRouteType, Validators.required],
    origin: [null as number | null],
    origin_label: [''],
    destination: [null as number | null],
    destination_label: [''],
    driver: [null as number | null, Validators.required],
    vehicle: [null as number | null, Validators.required],
    scheduled_date: [new Date().toISOString().slice(0, 10), Validators.required],
    scheduled_time: [''],
    notes: [''],
  });

  readonly formRouteType = signal<InternalRouteType>('WAREHOUSE_TRANSFER');

  ngOnInit(): void {
    this.routeForm.get('route_type')?.valueChanges.subscribe((t) => {
      if (!t) return;
      this.formRouteType.set(t);
      if (t === 'PO_PICKUP') {
        this.routeForm.patchValue({ origin: null });
      } else if (t === 'WAREHOUSE_TRANSFER') {
        this.routeForm.patchValue({ origin_label: '', destination_label: '' });
        this.selectedPoIds.set([]);
        this.grnHints.set([]);
      } else if (t === 'CUSTOM') {
        this.routeForm.patchValue({ origin: null });
        this.selectedPoIds.set([]);
        this.grnHints.set([]);
      }
    });
    this.loadReferenceData();
    this.load();
  }

  loadReferenceData(): void {
    this.logistics.getDrivers({ page_size: 200, is_active: true }).subscribe({
      next: (d) => this.drivers.set(d.results),
      error: () => this.drivers.set([]),
    });
    this.logistics.getVehicles({ page_size: 200, is_active: true }).subscribe({
      next: (d) => this.vehicles.set(d.results),
      error: () => this.vehicles.set([]),
    });
    this.inventory.getWarehouses().subscribe({
      next: (w) => this.warehouses.set(w),
      error: () => this.warehouses.set([]),
    });
    this.logistics
      .getInternalRoutes({ page_size: 200, status: 'PLANNED' })
      .subscribe({
        next: (planned) => {
          this.logistics
            .getInternalRoutes({ page_size: 200, status: 'IN_PROGRESS' })
            .subscribe({
              next: (inProgress) =>
                this.activeRoutes.set([...planned.results, ...inProgress.results]),
              error: () => this.activeRoutes.set(planned.results),
            });
        },
        error: () => this.activeRoutes.set([]),
      });
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 10,
      ordering: '-scheduled_date',
    };
    if (this.search()) params['search'] = this.search();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.routeTypeFilter()) params['route_type'] = this.routeTypeFilter();
    if (this.driverFilter()) params['driver_id'] = Number(this.driverFilter());
    if (this.vehicleFilter()) params['vehicle_id'] = Number(this.vehicleFilter());
    if (this.dateFrom()) params['date_from'] = this.dateFrom();
    if (this.dateTo()) params['date_to'] = this.dateTo();
    if (this.companyFilter()) params['company_id'] = Number(this.companyFilter());

    this.logistics
      .getInternalRoutes(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.routes.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  originDisplay(route: InternalRoute): string {
    if (route.origin_name) return route.origin_name;
    return route.origin_label || '—';
  }

  destinationDisplay(route: InternalRoute): string {
    if (route.destination_name) return route.destination_name;
    return route.destination_label || '—';
  }

  driverHint(driverId: number, excludeRouteId?: number): string | null {
    const conflict = this.activeRoutes().find(
      (r) => r.driver === driverId && r.id !== excludeRouteId,
    );
    return conflict ? `On ${conflict.route_number} (${conflict.status})` : null;
  }

  vehicleHint(vehicleId: number, excludeRouteId?: number): string | null {
    const conflict = this.activeRoutes().find(
      (r) => r.vehicle === vehicleId && r.id !== excludeRouteId,
    );
    return conflict ? `On ${conflict.route_number} (${conflict.status})` : null;
  }

  openCreate(): void {
    const companies = this.userCompanies();
    const defaultCompany =
      this.companyContext.activeCompany()?.id !== 'consolidated'
        ? (this.companyContext.activeCompany()?.id as number | undefined)
        : companies[0]?.company_id;

    this.selectedPoIds.set([]);
    this.grnHints.set([]);
    this.routeForm.reset({
      company: defaultCompany ?? null,
      route_type: 'WAREHOUSE_TRANSFER',
      origin: null,
      origin_label: '',
      destination: null,
      destination_label: '',
      driver: null,
      vehicle: null,
      scheduled_date: new Date().toISOString().slice(0, 10),
      scheduled_time: '',
      notes: '',
    });
    this.formRouteType.set('WAREHOUSE_TRANSFER');
    this.loadPurchaseOrders(defaultCompany ?? undefined);
    this.modalMode.set('create');
  }

  openView(route: InternalRoute): void {
    this.selectedRoute.set(route);
    this.modalMode.set('view');
  }

  openEdit(route: InternalRoute): void {
    this.selectedRoute.set(route);
    this.routeForm.patchValue({
      driver: route.driver,
      vehicle: route.vehicle,
      scheduled_date: route.scheduled_date,
      scheduled_time: route.scheduled_time?.slice(0, 5) ?? '',
      notes: route.notes,
      origin_label: route.origin_label,
      destination: route.destination,
      destination_label: route.destination_label,
    });
    this.formRouteType.set(route.route_type);
    this.modalMode.set('edit');
  }

  openAddPo(route: InternalRoute): void {
    this.selectedRoute.set(route);
    this.addPoId.set(null);
    this.loadPurchaseOrders(route.company);
    this.modalMode.set('addPo');
  }

  openCancel(route: InternalRoute): void {
    this.selectedRoute.set(route);
    this.cancelReason.set('');
    this.modalMode.set('cancel');
  }

  closeModal(): void {
    this.modalMode.set(null);
    this.selectedRoute.set(null);
  }

  loadPurchaseOrders(companyId?: number): void {
    const params: Record<string, string | number> = { page_size: 100, ordering: '-order_date' };
    if (companyId) params['company_id'] = companyId;
    this.procurement.getPurchaseOrders(params).subscribe({
      next: (d) => this.purchaseOrders.set(d.results),
      error: () => this.purchaseOrders.set([]),
    });
  }

  onFormCompanyChange(companyId: number | null | undefined): void {
    if (companyId) this.loadPurchaseOrders(companyId);
  }

  togglePoSelection(poId: number): void {
    const current = this.selectedPoIds();
    if (current.includes(poId)) {
      this.selectedPoIds.set(current.filter((id) => id !== poId));
    } else {
      this.selectedPoIds.set([...current, poId]);
    }
    this.refreshGrnHints();
  }

  refreshGrnHints(): void {
    const ids = this.selectedPoIds();
    if (!ids.length) {
      this.grnHints.set([]);
      return;
    }
    this.logistics.getGrnDestinations(ids).subscribe({
      next: (hints) => {
        this.grnHints.set(hints);
        const warehouseIds = new Set(
          hints.map((h) => h.warehouse_id).filter((id): id is number => id != null),
        );
        if (warehouseIds.size === 1) {
          this.routeForm.patchValue({ destination: [...warehouseIds][0] });
        }
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  saveRoute(): void {
    if (this.routeForm.invalid) {
      this.routeForm.markAllAsTouched();
      return;
    }
    const raw = this.routeForm.getRawValue();
    const routeType = raw.route_type as InternalRouteType;

    if (routeType === 'WAREHOUSE_TRANSFER') {
      if (!raw.origin || !raw.destination) {
        this.notification.error('Origin and destination warehouses are required.');
        return;
      }
    }
    if (routeType === 'PO_PICKUP') {
      if (!raw.origin_label?.trim()) {
        this.notification.error('Pickup location (origin label) is required for PO pickup routes.');
        return;
      }
      if (!this.selectedPoIds().length) {
        this.notification.error('Select at least one purchase order.');
        return;
      }
    }
    if (routeType === 'CUSTOM' && !raw.origin_label?.trim() && !raw.destination_label?.trim()) {
      this.notification.error('Provide origin and destination labels for custom routes.');
      return;
    }

    this.saving.set(true);
    const mode = this.modalMode();
    if (mode === 'create') {
      const payload: Parameters<LogisticsService['createInternalRoute']>[0] = {
        company: raw.company!,
        route_type: routeType,
        driver: raw.driver!,
        vehicle: raw.vehicle!,
        scheduled_date: raw.scheduled_date!,
        scheduled_time: raw.scheduled_time || null,
        notes: raw.notes || '',
      };

      if (routeType === 'WAREHOUSE_TRANSFER') {
        payload.origin = raw.origin;
        payload.destination = raw.destination;
      } else if (routeType === 'PO_PICKUP') {
        payload.origin_label = raw.origin_label || '';
        payload.destination = raw.destination;
        payload.destination_label = raw.destination_label || '';
        payload.po_ids = this.selectedPoIds();
      } else {
        payload.origin_label = raw.origin_label || '';
        payload.destination = raw.destination;
        payload.destination_label = raw.destination_label || '';
      }

      this.logistics
        .createInternalRoute(payload)
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (res) => this.onMutationSuccess(res.message, res.warning, res.warnings),
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      return;
    }

    if (mode === 'edit' && this.selectedRoute()) {
      this.logistics
        .updateInternalRoute(this.selectedRoute()!.id, {
          driver: raw.driver ?? undefined,
          vehicle: raw.vehicle ?? undefined,
          scheduled_date: raw.scheduled_date ?? undefined,
          scheduled_time: raw.scheduled_time || null,
          notes: raw.notes ?? undefined,
          origin_label: raw.origin_label ?? undefined,
          destination: raw.destination,
          destination_label: raw.destination_label ?? undefined,
        })
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (res) => this.onMutationSuccess(res.message, res.warning, res.warnings),
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
    }
  }

  submitAddPo(): void {
    const route = this.selectedRoute();
    const poId = this.addPoId();
    if (!route || !poId) {
      this.notification.error('Select a purchase order.');
      return;
    }
    this.saving.set(true);
    this.logistics
      .addPoToInternalRoute(route.id, poId)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Purchase order linked');
          this.closeModal();
          this.load();
          this.loadReferenceData();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  submitCancel(): void {
    const route = this.selectedRoute();
    if (!route) return;
    this.saving.set(true);
    this.logistics
      .cancelInternalRoute(route.id, this.cancelReason())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Route cancelled');
          this.closeModal();
          this.load();
          this.loadReferenceData();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  removePo(route: InternalRoute, poId: number): void {
    this.confirm
      .open({
        title: 'Remove PO',
        message: 'Remove this purchase order from the route?',
        confirmLabel: 'Remove',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.logistics.removePoFromInternalRoute(route.id, poId).subscribe({
          next: () => {
            this.notification.success('Purchase order removed');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  private onMutationSuccess(
    message: string,
    warning?: string | null,
    warnings?: unknown[] | null,
  ): void {
    this.notification.success(message);
    if (warning) {
      this.notification.warning(warning);
    } else if (warnings?.length) {
      const first = warnings[0] as InternalRouteWarning;
      if (first?.message) this.notification.warning(first.message);
    }
    this.closeModal();
    this.load();
    this.loadReferenceData();
  }
}
