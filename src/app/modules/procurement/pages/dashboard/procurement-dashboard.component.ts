import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ProcurementDashboardData } from '../../../../core/models/procurement.model';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { formatCurrency, formatDateTime } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';

@Component({
  selector: 'app-procurement-dashboard',
  imports: [
    RouterLink,
    PageHeaderComponent,
    ProcurementNavComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './procurement-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcurementDashboardComponent implements OnInit {
  private readonly procurement = inject(ProcurementService);

  readonly data = signal<ProcurementDashboardData | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly formatCurrency = formatCurrency;
  readonly formatDateTime = formatDateTime;

  readonly quickActions = [
    { label: 'New Requisition', route: '/procurement/requisitions/new' },
    { label: 'Create RFQ', route: '/procurement/rfq' },
    { label: 'New Purchase Order', route: '/procurement/purchase-orders/new' },
    { label: 'Record GRN', route: '/procurement/grn/new' },
    { label: 'Add Supplier', route: '/procurement/suppliers' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.procurement
      .getDashboard()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => this.data.set(d),
        error: () => this.error.set(true),
      });
  }

  maxMonthlySpend(): number {
    const months = this.data()?.monthly_chart ?? [];
    return Math.max(...months.map((m) => +m.spend), 1);
  }

  activityLabel(type: string): string {
    const labels: Record<string, string> = {
      REQUISITION: 'Requisition',
      PURCHASE_ORDER: 'Purchase Order',
      GRN: 'Goods Received',
    };
    return labels[type] ?? type;
  }

  activityRoute(type: string): string {
    const routes: Record<string, string> = {
      REQUISITION: '/procurement/requisitions',
      PURCHASE_ORDER: '/procurement/purchase-orders',
      GRN: '/procurement/grn',
    };
    return routes[type] ?? '/procurement';
  }
}
