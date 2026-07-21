import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { LogisticsSalesOrderDetail } from '../../../../core/models/logistics.model';
import { SOItem } from '../../../../core/models/sales.model';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

import { DELIVERY_METHODS } from '../../../sales/constants/sales.constants';

const DELIVERY_TYPE_LABELS = Object.fromEntries(
  DELIVERY_METHODS.map((m) => [m.value, m.label]),
) as Record<string, string>;

@Component({
  selector: 'app-lo-so-order-detail',
  imports: [StatusBadgeComponent],
  templateUrl: './lo-so-order-detail.component.html',
  styleUrl: './lo-so-order-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoSoOrderDetailComponent {
  readonly order = input.required<LogisticsSalesOrderDetail>();

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  formatMoney(amount: number | undefined, currency = 'TZS'): string {
    return formatCurrency(amount ?? 0, currency);
  }

  formatQty(value: number | string | undefined | null): string {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n)) return '0';
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
  }

  dispatchQty(line: SOItem): number {
    return Number(line.dispatch_qty ?? 0);
  }

  lineDispatchSubtotal(line: SOItem): number {
    const qty = this.dispatchQty(line);
    if (qty <= 0) return 0;
    const price = Number(line.unit_price ?? 0);
    const discount = Number(line.discount_percent ?? 0);
    return qty * price * (1 - discount / 100);
  }

  lineDispatchTax(line: SOItem): number {
    const subtotal = this.lineDispatchSubtotal(line);
    const taxRate = Number(line.tax_rate ?? 0);
    return subtotal * (taxRate / 100);
  }

  lineDispatchTotal(line: SOItem): number {
    return this.lineDispatchSubtotal(line) + this.lineDispatchTax(line);
  }

  dispatchSubtotal(order = this.order()): number {
    return (order.items ?? []).reduce(
      (sum, line) => sum + this.lineDispatchSubtotal(line),
      0,
    );
  }

  dispatchTax(order = this.order()): number {
    return (order.items ?? []).reduce(
      (sum, line) => sum + this.lineDispatchTax(line),
      0,
    );
  }

  dispatchTotal(order = this.order()): number {
    return (order.items ?? []).reduce(
      (sum, line) => sum + this.lineDispatchTotal(line),
      0,
    );
  }

  hasActiveDispatchLine(order = this.order()): boolean {
    return (order.items ?? []).some((line) => this.dispatchQty(line) > 0);
  }

  deliveryTypeLabel(method?: string | null): string {
    if (!method) return '—';
    return DELIVERY_TYPE_LABELS[method] ?? method;
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

  hasStockOutstanding(order = this.order()): boolean {
    return (order.items ?? []).some((line) => Number(line.stock_outstanding_qty ?? 0) > 0);
  }

  dispatchQtyTotal(order = this.order()): number {
    return (order.items ?? []).reduce(
      (sum, line) => sum + Number(line.dispatch_qty ?? 0),
      0,
    );
  }
}
