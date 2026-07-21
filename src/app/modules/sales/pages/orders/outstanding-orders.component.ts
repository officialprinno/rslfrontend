import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  OutstandingSalesOrder,
  StockOutstandingSalesOrder,
} from '../../../../core/models/sales.model';
import { PaginatedData } from '../../../../core/models/paginated.model';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatNumber } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../../inventory/components/inventory-nav/inventory-nav.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import {
  canGenerateFulfillmentInvoice,
  canViewOutstandingOrders,
} from '../../utils/sales-permissions.util';

@Component({
  selector: 'app-outstanding-orders',
  imports: [
    DatePipe,
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    InventoryNavComponent,
    PaginationComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
  ],
  templateUrl: './outstanding-orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OutstandingOrdersComponent implements OnInit {
  private readonly sales = inject(SalesService);
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  readonly navShell = computed(
    () => (this.route.snapshot.data['navShell'] as string) || 'sales',
  );
  readonly isInventoryView = computed(() => this.navShell() === 'inventory');

  readonly rows = signal<OutstandingSalesOrder[]>([]);
  readonly stockRows = signal<StockOutstandingSalesOrder[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly reservingId = signal<number | null>(null);
  readonly procuringId = signal<number | null>(null);

  readonly canGenerate = () => canGenerateFulfillmentInvoice(this.auth);
  readonly formatCurrency = formatCurrency;
  readonly formatNumber = formatNumber;

  ngOnInit(): void {
    const allowed = this.isInventoryView()
      ? this.auth.hasPermission('inventory', 'read')
      : canViewOutstandingOrders(this.auth);
    if (!allowed) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const params = { page: this.page(), page_size: this.pageSize() };
    const done = () => this.loading.set(false);

    if (this.isInventoryView()) {
      this.inventory
        .getStockOutstandingOrders(params)
        .pipe(finalize(done))
        .subscribe({
          next: (data: PaginatedData<StockOutstandingSalesOrder>) => {
            this.stockRows.set(data.results);
            this.total.set(data.count);
          },
          error: () => this.error.set(true),
        });
      return;
    }

    this.sales
      .getOutstandingOrders(params)
      .pipe(finalize(done))
      .subscribe({
        next: (data: PaginatedData<OutstandingSalesOrder>) => {
          this.rows.set(data.results);
          this.total.set(data.count);
        },
        error: () => this.error.set(true),
      });
  }
  onPageChange(p: number): void {
    this.page.set(p);
    this.load();
  }

  reserveAvailable(row: StockOutstandingSalesOrder): void {
    this.reservingId.set(row.id);
    this.inventory
      .reserveAvailableSalesOrderStock(row.id)
      .pipe(finalize(() => this.reservingId.set(null)))
      .subscribe({
        next: ({ message }) => {
          this.notification.success(message || 'Available stock reserved.');
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  sendToProcurement(row: StockOutstandingSalesOrder): void {
    if (row.can_request_procurement === false) {
      return;
    }
    this.procuringId.set(row.id);
    this.inventory
      .createSalesOrderProcurement(row.id)
      .pipe(finalize(() => this.procuringId.set(null)))
      .subscribe({
        next: (result) => {
          this.notification.success(
            `Purchase requisition ${result.pr_number} created — Procurement notified.`,
          );
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}