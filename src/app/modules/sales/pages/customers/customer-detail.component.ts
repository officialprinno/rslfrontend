import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  Customer,
  CustomerPayment,
  CustomerStatement,
  Invoice,
  SalesOrder,
} from '../../../../core/models/sales.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { printDocument } from '../../../../core/utils/sales-pdf.util';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { PaymentTermsBadgeComponent } from '../../../procurement/components/payment-terms-badge/payment-terms-badge.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { MINE_TYPES } from '../../constants/sales.constants';

type CustomerTab = 'overview' | 'orders' | 'invoices' | 'payments' | 'statement';

@Component({
  selector: 'app-customer-detail',
  imports: [
    DecimalPipe,
    KeyValuePipe,
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
    PaymentTermsBadgeComponent,
  ],
  templateUrl: './customer-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sales = inject(SalesService);
  private readonly notification = inject(NotificationService);

  readonly customer = signal<Customer | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly activeTab = signal<CustomerTab>('overview');

  readonly orders = signal<SalesOrder[]>([]);
  readonly ordersLoading = signal(false);
  readonly ordersTotal = signal(0);
  readonly ordersPage = signal(1);

  readonly invoices = signal<Invoice[]>([]);
  readonly invoicesLoading = signal(false);
  readonly invoicesTotal = signal(0);
  readonly invoicesPage = signal(1);

  readonly payments = signal<CustomerPayment[]>([]);
  readonly paymentsLoading = signal(false);
  readonly paymentsTotal = signal(0);
  readonly paymentsPage = signal(1);

  readonly statement = signal<CustomerStatement | null>(null);
  readonly statementLoading = signal(false);
  readonly statementDateFrom = signal('');
  readonly statementDateTo = signal('');

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly mineTypes = MINE_TYPES;

  readonly tabs: { id: CustomerTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'orders', label: 'Sales Orders' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'payments', label: 'Payments' },
    { id: 'statement', label: 'Statement' },
  ];

  ngOnInit(): void {
    this.loadCustomer();
  }

  customerId(): number {
    return +this.route.snapshot.paramMap.get('id')!;
  }

  loadCustomer(): void {
    this.loading.set(true);
    this.error.set(false);
    this.sales
      .getCustomer(this.customerId())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (c) => this.customer.set(c),
        error: () => this.error.set(true),
      });
  }

  setTab(tab: CustomerTab): void {
    this.activeTab.set(tab);
    if (tab === 'orders' && !this.orders().length) this.loadOrders();
    if (tab === 'invoices' && !this.invoices().length) this.loadInvoices();
    if (tab === 'payments' && !this.payments().length) this.loadPayments();
    if (tab === 'statement' && !this.statement()) this.loadStatement();
  }

  mineTypeLabel(value: string): string {
    return this.mineTypes.find((m) => m.value === value)?.label ?? value;
  }

  creditUsedPercent(c: Customer): number {
    if (!c.credit_limit) return 0;
    const used = c.credit_limit - c.credit_balance;
    return Math.min(100, Math.max(0, (used / c.credit_limit) * 100));
  }

  loadOrders(): void {
    this.ordersLoading.set(true);
    this.sales
      .getSalesOrders({ customer: this.customerId(), page: this.ordersPage(), page_size: 10 })
      .pipe(finalize(() => this.ordersLoading.set(false)))
      .subscribe({
        next: (d) => {
          this.orders.set(d.results);
          this.ordersTotal.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  loadInvoices(): void {
    this.invoicesLoading.set(true);
    this.sales
      .getInvoices({ customer: this.customerId(), page: this.invoicesPage(), page_size: 10 })
      .pipe(finalize(() => this.invoicesLoading.set(false)))
      .subscribe({
        next: (d) => {
          this.invoices.set(d.results);
          this.invoicesTotal.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  loadPayments(): void {
    this.paymentsLoading.set(true);
    this.sales
      .getPayments({ customer: this.customerId(), page: this.paymentsPage(), page_size: 10 })
      .pipe(finalize(() => this.paymentsLoading.set(false)))
      .subscribe({
        next: (d) => {
          this.payments.set(d.results);
          this.paymentsTotal.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  loadStatement(): void {
    this.statementLoading.set(true);
    this.sales
      .getCustomerStatement(
        this.customerId(),
        this.statementDateFrom() || undefined,
        this.statementDateTo() || undefined,
      )
      .pipe(finalize(() => this.statementLoading.set(false)))
      .subscribe({
        next: (s) => this.statement.set(s),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  printStatement(): void {
    printDocument('statement-print-area');
  }
}
