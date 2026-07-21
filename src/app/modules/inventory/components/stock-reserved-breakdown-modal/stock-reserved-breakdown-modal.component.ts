import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { StockReservationBreakdown } from '../../../../core/models/inventory.model';
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
  /** Emitted after unallocated reserved stock is returned to available. */
  readonly stockUpdated = output<void>();

  readonly releasing = signal(false);
  readonly formatNumber = formatNumber;
  readonly canReturnUnallocated = () => canReserveStock(this.auth);

  returnUnallocatedStock(): void {
    const data = this.breakdown();
    if (!data || !this.canReturnUnallocated()) {
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
}
