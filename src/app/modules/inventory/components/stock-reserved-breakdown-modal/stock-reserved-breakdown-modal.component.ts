import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  StockReservationBreakdown,
  StockReservationLine,
} from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatNumber } from '../../../../core/utils/format.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { canReserveStock } from '../../utils/inventory-permissions.util';

@Component({
  selector: 'app-stock-reserved-breakdown-modal',
  imports: [ModalComponent, RouterLink, StatusBadgeComponent],
  templateUrl: './stock-reserved-breakdown-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockReservedBreakdownModalComponent {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly open = input(false);
  readonly loading = input(false);
  readonly breakdown = input<StockReservationBreakdown | null>(null);

  readonly close = output<void>();
  /** Emitted after reserved stock is returned / unreserved. */
  readonly stockUpdated = output<void>();
  /** Parent can refresh the breakdown without closing (optional). */
  readonly breakdownChanged = output<StockReservationBreakdown>();

  readonly releasing = signal(false);
  readonly unreservingItemId = signal<number | null>(null);
  readonly formatNumber = formatNumber;
  readonly canManageReservations = () => canReserveStock(this.auth);

  returnUnallocatedStock(): void {
    const data = this.breakdown();
    if (!data || !this.canManageReservations()) {
      return;
    }
    const qty = Number(data.unallocated_reserved ?? 0);
    if (qty <= 0) {
      return;
    }

    this.confirm
      .open({
        title: 'Return reserved stock',
        message:
          `Return ${this.formatNumber(qty)} unit(s) of ${data.item_code} to available stock?\n\n` +
          'These units are reserved on the stock row but not linked to any active sales order.',
        confirmLabel: 'Return to Available',
      })
      .subscribe((ok) => {
        if (!ok) {
          return;
        }
        this.releasing.set(true);
        this.inventory
          .releaseUnallocatedReservedStock(data.stock_id)
          .pipe(finalize(() => this.releasing.set(false)))
          .subscribe({
            next: (res) => {
              this.notification.success(
                `Returned ${res.released_qty} unit(s) of ${data.item_code} to available stock.`,
              );
              this.stockUpdated.emit();
              this.close.emit();
            },
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
      });
  }

  unreserveLine(row: StockReservationLine): void {
    const data = this.breakdown();
    if (!data || !this.canManageReservations()) {
      return;
    }
    if (!row.can_unreserve) {
      this.notification.error(
        row.unreserve_blocked_reason ||
          'Cannot unreserve — delivery is already scheduled or completed.',
      );
      return;
    }
    const qty = Number(row.quantity_reserved ?? 0);
    if (qty <= 0 || !row.sales_order_item_id) {
      return;
    }

    this.confirm
      .open({
        title: 'Unreserve stock',
        message:
          `Unreserve ${this.formatNumber(qty)} unit(s) of ${row.item_code} from ${row.so_number} ` +
          `(${row.customer_name})?\n\n` +
          'Stock will return to available. This is only allowed before delivery is scheduled or completed.',
        confirmLabel: 'Unreserve',
      })
      .subscribe((ok) => {
        if (!ok) {
          return;
        }
        this.unreservingItemId.set(row.sales_order_item_id);
        this.inventory
          .unreserveSalesOrderLine(data.stock_id, row.sales_order_item_id)
          .pipe(finalize(() => this.unreservingItemId.set(null)))
          .subscribe({
            next: (res) => {
              this.notification.success(
                `Unreserved ${res.released_qty} unit(s) from ${res.so_number}.`,
              );
              this.breakdownChanged.emit(res.breakdown);
              const remaining = Number(res.breakdown.total_reserved ?? 0);
              const unallocated = Number(res.breakdown.unallocated_reserved ?? 0);
              if (remaining <= 0 && unallocated <= 0) {
                this.stockUpdated.emit();
                this.close.emit();
              }
            },
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
      });
  }
}
