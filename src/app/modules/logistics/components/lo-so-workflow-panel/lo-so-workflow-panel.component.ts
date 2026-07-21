import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Driver, Vehicle } from '../../../../core/models/logistics.model';
import { LogisticsSalesOrder } from '../../../../core/models/logistics.model';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import {
  SearchableSelectComponent,
  SelectOption,
} from '../../../../shared/components/searchable-select/searchable-select.component';
import { DELIVERY_METHODS } from '../../../sales/constants/sales.constants';

const DELIVERY_TYPE_LABELS = Object.fromEntries(
  DELIVERY_METHODS.map((m) => [m.value, m.label]),
) as Record<string, string>;

@Component({
  selector: 'app-lo-so-workflow-panel',
  imports: [FormsModule, SearchableSelectComponent],
  templateUrl: './lo-so-workflow-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoSoWorkflowPanelComponent {
  private readonly logistics = inject(LogisticsService);
  private readonly notification = inject(NotificationService);

  readonly order = input.required<LogisticsSalesOrder>();
  readonly refreshed = output<void>();

  readonly saving = signal(false);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly drivers = signal<Driver[]>([]);
  readonly loadingFleet = signal(false);
  private fleetLoaded = false;

  vehicleForm = { vehicle_id: null as number | null, driver_id: null as number | null, driver_phone: '' };
  thirdPartyForm = {
    transport_company: '',
    tracking_number: '',
    contact_person: '',
    contact_phone: '',
  };
  pickupForm = {
    pickup_date: new Date().toISOString().slice(0, 10),
    receiver_name: '',
    receiver_phone: '',
    notes: '',
  };
  deliveryForm = { receiver_name: '', receiver_phone: '', notes: '' };

  constructor() {
    effect(() => {
      const o = this.order();
      if (
        o.status === 'READY_FOR_DELIVERY' &&
        o.delivery_method === 'COMPANY' &&
        !this.fleetLoaded &&
        !this.loadingFleet()
      ) {
        this.loadFleetOptions();
      }
      if (o.delivery_method === 'PICKUP' && o.scheduled_pickup_date) {
        this.pickupForm.pickup_date = o.scheduled_pickup_date;
      }
    });
  }

  vehicleOptions(): SelectOption[] {
    return this.vehicles().map((v) => ({
      value: v.id,
      label: `${v.registration_number} — ${v.make} ${v.model}`,
      sublabel: v.vehicle_type,
    }));
  }

  driverOptions(): SelectOption[] {
    return this.drivers().map((d) => ({
      value: d.id,
      label: `${d.full_name} — ${d.license_number}`,
      sublabel: d.phone || undefined,
    }));
  }

  onVehicleSelected(value: number | string | null): void {
    this.vehicleForm.vehicle_id = value ? Number(value) : null;
  }

  onDriverSelected(value: number | string | null): void {
    const id = value ? Number(value) : null;
    this.vehicleForm.driver_id = id;
    const driver = this.drivers().find((d) => d.id === id);
    this.vehicleForm.driver_phone = driver?.phone ?? '';
  }

  loadFleetOptions(): void {
    this.loadingFleet.set(true);
    forkJoin({
      vehicles: this.logistics.getVehicles({ assignable: true, page_size: 200, is_active: true }),
      drivers: this.logistics.getDrivers({ assignable: true, page_size: 200, is_active: true }),
    }).subscribe({
      next: ({ vehicles, drivers }) => {
        this.vehicles.set(vehicles.results);
        this.drivers.set(drivers.results);
        this.fleetLoaded = true;
        this.loadingFleet.set(false);
      },
      error: (e) => {
        this.loadingFleet.set(false);
        this.notification.error(getApiErrorMessage(e));
      },
    });
  }

  private refresh(): void {
    this.refreshed.emit();
  }

  deliveryTypeLabel(method?: string | null): string {
    if (!method) return 'Not set';
    return DELIVERY_TYPE_LABELS[method] ?? method;
  }

  assignVehicle(): void {
    if (!this.vehicleForm.vehicle_id || !this.vehicleForm.driver_id) {
      this.notification.error('Select both a vehicle and a driver from the list.');
      return;
    }
    this.run(
      () =>
        this.logistics.assignSalesOrderVehicle(this.order().id, {
          vehicle_id: this.vehicleForm.vehicle_id,
          driver_id: this.vehicleForm.driver_id,
          driver_phone: this.vehicleForm.driver_phone,
        }),
      'Vehicle assigned',
      () => {
        this.vehicleForm = { vehicle_id: null, driver_id: null, driver_phone: '' };
      },
    );
  }

  assignThirdParty(): void {
    if (!this.thirdPartyForm.transport_company.trim()) {
      this.notification.error('Enter the transport company name.');
      return;
    }
    this.run(
      () => this.logistics.assignSalesOrderThirdParty(this.order().id, this.thirdPartyForm),
      'Carrier assigned',
    );
  }

  dispatch(): void {
    this.run(() => this.logistics.dispatchSalesOrder(this.order().id), 'Order dispatched', () => {
      this.fleetLoaded = false;
      this.loadFleetOptions();
    });
  }

  confirmPickup(): void {
    if (!this.pickupForm.pickup_date) {
      this.notification.error('Select a scheduled pickup date.');
      return;
    }
    const updating = !!this.order().scheduled_pickup_date;
    this.run(
      () =>
        this.logistics.scheduleSalesOrderPickup(this.order().id, {
          pickup_date: this.pickupForm.pickup_date,
          notes: this.pickupForm.notes,
        }),
      updating
        ? 'Pickup date updated — inventory notified'
        : 'Pickup scheduled — inventory notified',
    );
  }

  confirmDelivery(): void {
    this.run(
      () => this.logistics.confirmSalesOrderDelivery(this.order().id, this.deliveryForm),
      'Delivery recorded',
    );
  }

  logisticsConfirm(): void {
    this.run(() => this.logistics.logisticsConfirmSalesOrder(this.order().id), 'Logistics confirmed');
  }

  private run<T>(fn: () => import('rxjs').Observable<T>, successMsg: string, onSuccess?: () => void): void {
    this.saving.set(true);
    fn().subscribe({
      next: () => {
        this.saving.set(false);
        this.notification.success(successMsg);
        onSuccess?.();
        this.refresh();
      },
      error: (e) => {
        this.saving.set(false);
        this.notification.error(getApiErrorMessage(e));
      },
    });
  }
}
