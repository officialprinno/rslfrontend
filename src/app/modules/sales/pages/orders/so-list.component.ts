import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Customer, SalesOrder } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { canApproveSO, canCreateQuotation } from '../../utils/sales-permissions.util';

@Component({
  selector: 'app-so-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './so-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoListComponent implements OnInit {
  private readonly sales = inject(SalesService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly orders = signal<SalesOrder[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly customerFilter = signal<number | ''>('');
  readonly statusFilter = signal('');
  readonly deliveryFrom = signal('');
  readonly deliveryTo = signal('');

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly canAdd = () => canCreateQuotation(this.auth);
  readonly canConfirm = () => canApproveSO(this.auth);

  readonly statusOptions = ['DRAFT', 'CONFIRMED', 'PROCESSING', 'PARTIAL', 'DELIVERED', 'CANCELLED'];

  ngOnInit(): void {
    this.sales.getCustomers({ page_size: 100 }).subscribe((d) => this.customers.set(d.results));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 10,
      ordering: '-created_at',
    };
    if (this.search()) params['search'] = this.search();
    if (this.customerFilter()) params['customer'] = this.customerFilter() as number;
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.deliveryFrom()) params['delivery_from'] = this.deliveryFrom();
    if (this.deliveryTo()) params['delivery_to'] = this.deliveryTo();

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

  deliveryDateClass(order: SalesOrder): string {
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') return '';
    const delivery = new Date(order.delivery_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    delivery.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'text-red-600 font-semibold';
    if (diffDays <= 3) return 'text-amber-600 font-medium';
    return '';
  }

  confirmOrder(order: SalesOrder): void {
    this.confirm
      .open({
        title: 'Confirm Sales Order',
        message: `Confirm ${order.so_number} for ${order.customer_name}?`,
        confirmLabel: 'Confirm',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.sales.confirmSalesOrder(order.id).subscribe({
          next: () => {
            this.notification.success('Sales order confirmed');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  cancelOrder(order: SalesOrder): void {
    const reason = prompt('Cancellation reason:');
    if (!reason?.trim()) return;
    this.sales.cancelSalesOrder(order.id, reason).subscribe({
      next: () => {
        this.notification.success('Sales order cancelled');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
