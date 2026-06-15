import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { LogisticsSalesOrderDetail } from '../../../../core/models/logistics.model';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-lo-so-order-detail',
  imports: [DecimalPipe, StatusBadgeComponent],
  templateUrl: './lo-so-order-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoSoOrderDetailComponent {
  readonly order = input.required<LogisticsSalesOrderDetail>();

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  formatMoney(amount: number | undefined, currency = 'TZS'): string {
    return formatCurrency(amount ?? 0, currency);
  }

  destination(order = this.order()): string {
    return order.requested_delivery_location || order.delivery_address || order.customer_address || '—';
  }

  fleet(order = this.order()) {
    const d = order.delivery_order;
    const a = order.dispatch_assignment;
    return {
      vehicle:
        d?.vehicle_registration ||
        a?.vehicle_registration ||
        (a?.transport_company ? `${a.transport_company} (3rd party)` : null),
      vehicleDetail:
        d?.vehicle_make && d?.vehicle_model
          ? `${d.vehicle_make} ${d.vehicle_model}${d.vehicle_type ? ` · ${d.vehicle_type}` : ''}`
          : a?.vehicle_make && a?.vehicle_model
            ? `${a.vehicle_make} ${a.vehicle_model}`
            : null,
      vehicleStatus: d?.vehicle_status ?? null,
      driver: d?.driver_name || a?.driver_name || a?.contact_person || null,
      driverPhone: d?.driver_phone || a?.driver_phone || a?.contact_phone || null,
      driverLicense: d?.driver_license || a?.driver_license || null,
      doNumber: d?.do_number ?? null,
      doStatus: d?.status ?? null,
      departed: d?.actual_departure ?? null,
      tracking: a?.tracking_number ?? null,
    };
  }
}
