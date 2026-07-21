import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import {
  InventorySalesOrderDetail,
} from '../../../../core/models/inventory.model';
import { SOStockCheck } from '../../../../core/models/sales.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { InvSoWorkflowPrintComponent } from '../inv-so-workflow-print/inv-so-workflow-print.component';

@Component({
  selector: 'app-inv-so-stock-panel',
  imports: [InvSoWorkflowPrintComponent],
  templateUrl: './inv-so-stock-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvSoStockPanelComponent {
  private readonly inventory = inject(InventoryService);
  private readonly notification = inject(NotificationService);

  readonly order = input.required<InventorySalesOrderDetail>();
  readonly refreshed = output<void>();

  readonly stockCheck = signal<SOStockCheck | null>(null);
  readonly loadingCheck = signal(false);
  readonly saving = signal(false);

  constructor() {
    effect(() => {
      const order = this.order();
      if (
        order.status === 'STOCK_VERIFICATION' ||
        order.status === 'OUT_OF_STOCK'
      ) {
        this.loadStockCheck(order.id);
      }
    });
  }

  loadStockCheck(id: number): void {
    this.loadingCheck.set(true);
    this.inventory.getSalesOrderStockCheck(id).subscribe({
      next: (check) => {
        this.stockCheck.set(check);
        this.loadingCheck.set(false);
      },
      error: () => this.loadingCheck.set(false),
    });
  }

  verifyStock(): void {
    this.saving.set(true);
    this.inventory.verifySalesOrderStock(this.order().id, false).subscribe({
      next: (result) => {
        this.saving.set(false);
        const msg =
          result.result === 'RESERVED'
            ? 'Stock verified and reserved'
            : result.result === 'PARTIAL_RESERVED'
              ? 'Available stock reserved — outstanding quantities recorded for Sales'
              : 'No stock available — order remains out of stock';
        this.notification.success(msg);
        this.refreshed.emit();
      },
      error: (e) => {
        this.saving.set(false);
        this.notification.error(getApiErrorMessage(e));
      },
    });
  }

  hasAnyAvailable(check: SOStockCheck): boolean {
    return check.lines.some(
      (line) =>
        Number(line.quantity_available_all_warehouses ?? line.quantity_available) > 0,
    );
  }

  createProcurement(): void {
    this.saving.set(true);
    this.inventory.createSalesOrderProcurement(this.order().id).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.notification.success(`Procurement request ${result.pr_number} created`);
        this.refreshed.emit();
      },
      error: (e) => {
        this.saving.set(false);
        this.notification.error(getApiErrorMessage(e));
      },
    });
  }
}
