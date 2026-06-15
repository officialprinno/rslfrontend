import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { PurchaseOrder, Supplier } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';
import { canManagePO } from '../../utils/procurement-permissions.util';

@Component({
  selector: 'app-po-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    ProcurementNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './po-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoListComponent implements OnInit {
  private readonly procurement = inject(ProcurementService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly orders = signal<PurchaseOrder[]>([]);
  readonly suppliers = signal<Supplier[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly supplierFilter = signal<number | ''>('');
  readonly statusFilter = signal('');
  readonly dateFrom = signal('');
  readonly dateAfter = signal('');

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly canAdd = () => canManagePO(this.auth);

  ngOnInit(): void {
    this.procurement.getSuppliers({ page_size: 100 }).subscribe((d) => this.suppliers.set(d.results));
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
    if (this.supplierFilter()) params['supplier'] = this.supplierFilter() as number;
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.dateFrom()) params['date_from'] = this.dateFrom();
    if (this.dateAfter()) params['date_after'] = this.dateAfter();

    this.procurement
      .getPurchaseOrders(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => { this.orders.set(d.results); this.total.set(d.count); },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
