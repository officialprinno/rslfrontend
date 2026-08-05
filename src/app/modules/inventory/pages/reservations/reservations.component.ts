import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Stock, StockReservationBreakdown } from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { WarehouseContextService } from '../../../../core/services/warehouse-context.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { ProcurementBadgeComponent } from '../../components/procurement-badge/procurement-badge.component';
import { StockReservedBreakdownModalComponent } from '../../components/stock-reserved-breakdown-modal/stock-reserved-breakdown-modal.component';
import { canReserveStock } from '../../utils/inventory-permissions.util';

@Component({
  selector: 'app-reservations',
  imports: [
    DecimalPipe,
    FormsModule,
    PageHeaderComponent,
    InventoryNavComponent,
    ProcurementBadgeComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StockReservedBreakdownModalComponent,
  ],
  templateUrl: './reservations.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationsComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  readonly warehouseContext = inject(WarehouseContextService);

  readonly rows = signal<Stock[]>([]);
  readonly loading = signal(true);
  readonly canManage = () => canReserveStock(this.auth);

  readonly reservedModalOpen = signal(false);
  readonly reservedLoading = signal(false);
  readonly reservedBreakdown = signal<StockReservationBreakdown | null>(null);

  readonly totalReserved = computed(() =>
    this.rows().reduce((sum, row) => sum + Number(row.quantity_reserved || 0), 0),
  );
  readonly skuCount = computed(() => this.rows().length);
  readonly warehouseCount = computed(() => new Set(this.rows().map((r) => r.warehouse)).size);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number | boolean> = {
      page_size: 100,
      has_reserved: true,
    };
    const wh = this.warehouseContext.activeWarehouseId();
    if (wh) {
      params['warehouse'] = wh;
    }
    this.inventory
      .getStock(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.rows.set(data.results),
        error: (err) => this.notification.error(getApiErrorMessage(err, 'Failed to load reservations')),
      });
  }

  openReservedBreakdown(row: Stock): void {
    if (Number(row.quantity_reserved ?? 0) <= 0) {
      return;
    }
    this.reservedModalOpen.set(true);
    this.reservedLoading.set(true);
    this.reservedBreakdown.set(null);
    this.inventory.getStockReservationBreakdown(row.id).subscribe({
      next: (data) => {
        this.reservedBreakdown.set(data);
        this.reservedLoading.set(false);
      },
      error: (err) => {
        this.reservedLoading.set(false);
        this.reservedModalOpen.set(false);
        this.notification.error(getApiErrorMessage(err, 'Failed to load reserved stock details'));
      },
    });
  }

  closeReservedBreakdown(): void {
    this.reservedModalOpen.set(false);
    this.reservedBreakdown.set(null);
  }

  onBreakdownChanged(data: StockReservationBreakdown): void {
    this.reservedBreakdown.set(data);
    this.load();
  }

  onReservedStockReturned(): void {
    this.closeReservedBreakdown();
    this.load();
  }

  manageReservations(row: Stock): void {
    this.openReservedBreakdown(row);
  }
}
