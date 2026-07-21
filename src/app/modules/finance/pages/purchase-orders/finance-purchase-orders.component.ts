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
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';

@Component({
  selector: 'app-finance-purchase-orders',
  imports: [
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './finance-purchase-orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancePurchaseOrdersComponent implements OnInit {
  private readonly procurement = inject(ProcurementService);

  readonly orders = signal<PurchaseOrder[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.procurement
      .getPurchaseOrders({
        page: this.page(),
        page_size: 15,
        ordering: '-approved_at',
        status: 'APPROVED,SENT,AWAITING_DELIVERY,PARTIAL,RECEIVED,CLOSED',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.orders.set(d.results);
          this.total.set(d.count);
        },
      });
  }
}
