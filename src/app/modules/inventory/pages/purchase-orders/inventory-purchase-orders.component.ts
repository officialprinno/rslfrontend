import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { PurchaseOrder } from '../../../../core/models/procurement.model';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { canManageGRN } from '../../../procurement/utils/procurement-permissions.util';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyContextService } from '../../../../core/services/company-context.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';

@Component({
  selector: 'app-inventory-purchase-orders',
  imports: [
    RouterLink,
    PageHeaderComponent,
    InventoryNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './inventory-purchase-orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryPurchaseOrdersComponent implements OnInit {
  private readonly procurement = inject(ProcurementService);
  private readonly auth = inject(AuthService);
  private readonly companyCtx = inject(CompanyContextService);
  private readonly notification = inject(NotificationService);

  readonly orders = signal<PurchaseOrder[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly canReceive = () => canManageGRN(this.auth, this.companyCtx);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.procurement
      .getPurchaseOrders({
        page: this.page(),
        page_size: 15,
        receivable: true,
        ordering: '-approved_at',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.orders.set(d.results);
          this.total.set(d.count);
        },
      });
  }

  isReceivable(po: PurchaseOrder): boolean {
    return ['APPROVED', 'SENT', 'PARTIAL', 'AWAITING_DELIVERY'].includes(po.status);
  }

  allItemsReceived(po: PurchaseOrder): boolean {
    if (!po.items?.length) return false;
    return po.items.every(
      (item) => Number(item.quantity_received ?? 0) >= Number(item.quantity_ordered ?? 0),
    );
  }

  canMarkReceived(po: PurchaseOrder): boolean {
    return (
      (po.status === 'PARTIAL' || po.status === 'SENT' || po.status === 'AWAITING_DELIVERY') &&
      this.allItemsReceived(po) &&
      this.canReceive()
    );
  }

  markReceived(po: PurchaseOrder): void {
    this.procurement.markPurchaseOrderReceived(po.id).subscribe({
      next: () => {
        this.notification.success(`${po.po_number} marked as fully received`);
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
