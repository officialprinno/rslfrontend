import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Warehouse } from '../../../../core/models/inventory.model';
import { Driver, Vehicle } from '../../../../core/models/logistics.model';
import { DOFormData } from '../../../../core/models/logistics.model';
import { SalesOrder } from '../../../../core/models/sales.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import {
  SearchableSelectComponent,
  SelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';

@Component({
  selector: 'app-delivery-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    LogisticsNavComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './delivery-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly logistics = inject(LogisticsService);
  private readonly sales = inject(SalesService);
  private readonly inventory = inject(InventoryService);
  private readonly notification = inject(NotificationService);

  readonly salesOrders = signal<SalesOrder[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly drivers = signal<Driver[]>([]);
  readonly selectedSo = signal<SalesOrder | null>(null);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);

  readonly form = this.fb.group({
    sales_order: [null as number | null, Validators.required],
    origin_warehouse: [null as number | null, Validators.required],
    vehicle: [null as number | null],
    driver: [null as number | null],
    destination: [''],
    scheduled_date: ['', Validators.required],
    distance_km: [0, Validators.required],
    notes: [''],
    lineItems: this.fb.array([]),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    forkJoin({
      confirmed: this.sales.getSalesOrders({ status: 'CONFIRMED', page_size: 100 }),
      processing: this.sales.getSalesOrders({ status: 'PROCESSING', page_size: 100 }),
      warehouses: this.inventory.getWarehouses({ is_active: true }),
      vehicles: this.logistics.getVehicles({ status: 'AVAILABLE', page_size: 100 }),
      drivers: this.logistics.getDrivers({ is_available: true, page_size: 100 }),
    }).subscribe({
      next: ({ confirmed, processing, warehouses, vehicles, drivers }) => {
        const merged = [...confirmed.results, ...processing.results];
        this.salesOrders.set(merged);
        this.warehouses.set(warehouses);
        this.vehicles.set(vehicles.results);
        this.drivers.set(drivers.results);

        if (id) {
          this.editId.set(+id);
          this.loadDelivery(+id);
        }
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  lineItems(): FormArray {
    return this.form.get('lineItems') as FormArray;
  }

  soOptions(): SelectOption[] {
    return this.salesOrders().map((so) => ({
      value: so.id,
      label: `${so.so_number} — ${so.customer_name}`,
    }));
  }

  warehouseOptions(): SelectOption[] {
    return this.warehouses().map((w) => ({ value: w.id, label: w.name }));
  }

  vehicleOptions(): SelectOption[] {
    return this.vehicles().map((v) => ({
      value: v.id,
      label: `${v.registration_number} (${v.make} ${v.model})`,
    }));
  }

  driverOptions(): SelectOption[] {
    return this.drivers().map((d) => ({
      value: d.id,
      label: `${d.full_name} (${d.license_number})`,
    }));
  }

  loadDelivery(id: number): void {
    this.logistics.getDeliveryOrder(id).subscribe({
      next: (d) => {
        this.form.patchValue({
          sales_order: d.sales_order,
          origin_warehouse: d.origin_warehouse,
          vehicle: d.vehicle,
          driver: d.driver,
          destination: d.destination ?? '',
          scheduled_date: d.scheduled_date?.slice(0, 10) ?? '',
          distance_km: d.distance_km,
          notes: d.notes ?? '',
        });
        this.lineItems().clear();
        d.items.forEach((item) =>
          this.lineItems().push(
            this.fb.group({
              so_item: [item.so_item ?? item.so_item_id, Validators.required],
              item: [item.item ?? item.item_id, Validators.required],
              item_code: [item.item_code ?? ''],
              item_name: [item.item_name ?? ''],
              quantity_ordered: [item.quantity_ordered ?? 0],
              quantity_delivered: [item.quantity_delivered ?? 0],
              quantity: [item.quantity, Validators.required],
              serial_number: [item.serial_number ?? ''],
              condition_out: [item.condition_out ?? 'Good'],
              notes: [item.notes ?? ''],
            }),
          ),
        );
        this.sales.getSalesOrder(d.sales_order).subscribe((so) => this.selectedSo.set(so));
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  onSoSelect(soId: number | string | null): void {
    const id = typeof soId === 'number' ? soId : null;
    this.form.patchValue({ sales_order: id });
    if (!id) {
      this.selectedSo.set(null);
      this.lineItems().clear();
      return;
    }
    this.sales.getSalesOrder(id).subscribe({
      next: (so) => {
        this.selectedSo.set(so);
        this.form.patchValue({
          destination: so.delivery_address ?? '',
          scheduled_date: so.delivery_date?.slice(0, 10) ?? '',
        });
        this.lineItems().clear();
        so.items.forEach((line) => {
          const ordered = Number(line.quantity_ordered);
          const delivered = Number(line.quantity_delivered ?? 0);
          const remaining = Math.max(ordered - delivered, 0);
          if (remaining <= 0) return;
          this.lineItems().push(
            this.fb.group({
              so_item: [line.id, Validators.required],
              item: [line.item ?? line.item_id, Validators.required],
              item_code: [line.item_code ?? ''],
              item_name: [line.item_name ?? ''],
              quantity_ordered: [ordered],
              quantity_delivered: [delivered],
              quantity: [remaining, Validators.required],
              serial_number: [''],
              condition_out: ['Good'],
              notes: [''],
            }),
          );
        });
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  save(): void {
    if (this.form.invalid || !this.lineItems().length) {
      this.notification.error('Complete required fields and ensure line items exist.');
      return;
    }
    const raw = this.form.getRawValue();
    const payload: DOFormData = {
      sales_order: raw.sales_order!,
      origin_warehouse: raw.origin_warehouse!,
      vehicle: raw.vehicle,
      driver: raw.driver,
      destination: raw.destination ?? '',
      scheduled_date: raw.scheduled_date!,
      distance_km: Number(raw.distance_km),
      notes: raw.notes ?? '',
      items: (
        raw.lineItems as Array<{
          so_item: number;
          item: number;
          quantity: number;
          serial_number: string;
          condition_out: string;
          notes: string;
        }>
      ).map((l) => ({
        so_item: l.so_item,
        item: l.item,
        quantity: Number(l.quantity),
        serial_number: l.serial_number || undefined,
        condition_out: l.condition_out || undefined,
        notes: l.notes || undefined,
      })),
    };

    this.saving.set(true);
    const editId = this.editId();
    const req$ = editId
      ? this.logistics.updateDeliveryOrder(editId, payload)
      : this.logistics.createDeliveryOrder(payload);

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (d) => {
        this.notification.success(editId ? 'Delivery order updated' : 'Delivery order created');
        void this.router.navigate(['/logistics/deliveries', d.id, 'view']);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
