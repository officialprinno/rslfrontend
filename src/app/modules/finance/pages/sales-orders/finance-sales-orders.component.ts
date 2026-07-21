import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { SalesOrder } from '../../../../core/models/sales.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { ORDER_STATUS_LABELS } from '../../../sales/constants/sales.constants';

@Component({
  selector: 'app-finance-sales-orders',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './finance-sales-orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceSalesOrdersComponent implements OnInit {
  private readonly sales = inject(SalesService);
  private readonly notification = inject(NotificationService);

  readonly orders = signal<SalesOrder[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly statusFilter = signal('');

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly statusOptions = Object.keys(ORDER_STATUS_LABELS);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 15,
      ordering: '-updated_at',
    };
    if (this.search()) params['search'] = this.search();
    if (this.statusFilter()) params['status'] = this.statusFilter();

    this.sales
      .getSalesOrders(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.orders.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
