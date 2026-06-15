import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Customer, Quotation } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { canConvertToSO, canCreateQuotation, canDeleteAnything } from '../../utils/sales-permissions.util';

@Component({
  selector: 'app-quotations-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './quotations-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationsListComponent implements OnInit {
  private readonly sales = inject(SalesService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly router = inject(Router);

  readonly quotations = signal<Quotation[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly customerFilter = signal<number | ''>('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly canAdd = () => canCreateQuotation(this.auth);
  readonly canConvert = () => canConvertToSO(this.auth);
  readonly canDelete = () => canDeleteAnything(this.auth);

  readonly statuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'];

  ngOnInit(): void {
    this.sales.getCustomers({ page_size: 100, is_active: true }).subscribe((d) => this.customers.set(d.results));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: this.pageSize(),
      ordering: '-created_at',
    };
    if (this.search()) params['search'] = this.search();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.customerFilter()) params['customer'] = this.customerFilter() as number;
    if (this.dateFrom()) params['date_from'] = this.dateFrom();
    if (this.dateTo()) params['date_to'] = this.dateTo();

    this.sales
      .getQuotations(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.quotations.set(d.results);
          this.total.set(d.count);
        },
        error: () => this.error.set(true),
      });
  }

  isExpired(q: Quotation): boolean {
    return q.is_expired ?? new Date(q.valid_until) < new Date();
  }

  onSend(q: Quotation): void {
    this.confirm
      .open({ title: 'Send Quotation', message: `Send ${q.quotation_number} to customer?`, confirmLabel: 'Send' })
      .subscribe((ok) => {
        if (!ok) return;
        this.sales.sendQuotation(q.id).subscribe({
          next: () => {
            this.notification.success('Quotation sent');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  onConvert(q: Quotation): void {
    this.confirm
      .open({
        title: 'Convert to Sales Order',
        message: `Convert ${q.quotation_number} to a sales order?`,
        confirmLabel: 'Convert',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.sales.convertToSO(q.id).subscribe({
          next: (so) => {
            this.notification.success('Sales order created');
            void this.router.navigate(['/sales/orders', so.id, 'view']);
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  onDuplicate(q: Quotation): void {
    this.sales.duplicateQuotation(q.id).subscribe({
      next: (copy) => {
        this.notification.success('Quotation duplicated');
        void this.router.navigate(['/sales/quotations', copy.id, 'edit']);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  onDelete(q: Quotation): void {
    this.confirm
      .open({
        title: 'Delete Quotation',
        message: `Delete ${q.quotation_number}?`,
        confirmLabel: 'Delete',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.sales.deleteQuotation(q.id).subscribe({
          next: () => {
            this.notification.success('Quotation deleted');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  exportExcel(): void {
    exportToExcel('quotations', [
      { key: 'quotation_number', label: 'Quotation #' },
      { key: 'customer_name', label: 'Customer' },
      { key: 'mine_name', label: 'Mine' },
      { key: 'valid_until', label: 'Valid Until', format: (q) => formatDate(q.valid_until) },
      { key: 'total_amount', label: 'Total' },
      { key: 'status', label: 'Status' },
    ], this.quotations());
  }
}
