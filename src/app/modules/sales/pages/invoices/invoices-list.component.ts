import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Customer, Invoice } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
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
import { canManageInvoice } from '../../utils/sales-permissions.util';

@Component({
  selector: 'app-invoices-list',
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
  templateUrl: './invoices-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicesListComponent implements OnInit {
  private readonly sales = inject(SalesService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly invoices = signal<Invoice[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly customerFilter = signal<number | ''>('');
  readonly statusFilter = signal('');

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly canAdd = () => canManageInvoice(this.auth);
  readonly statusOptions = ['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE'];

  ngOnInit(): void {
    this.sales.getCustomers({ page_size: 100 }).subscribe((d) => this.customers.set(d.results));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 10,
      ordering: '-invoice_date',
    };
    if (this.search()) params['search'] = this.search();
    if (this.customerFilter()) params['customer'] = this.customerFilter() as number;
    if (this.statusFilter()) params['status'] = this.statusFilter();

    this.sales
      .getInvoices(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.invoices.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  isOverdue(inv: Invoice): boolean {
    if (inv.status === 'PAID') return false;
    return new Date(inv.due_date) < new Date() || inv.status === 'OVERDUE';
  }

  rowClass(inv: Invoice): string {
    return this.isOverdue(inv) ? 'bg-red-50/60' : '';
  }
}
