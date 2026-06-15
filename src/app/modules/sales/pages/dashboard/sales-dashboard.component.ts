import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { SalesDashboardData } from '../../../../core/models/sales.model';
import { SalesService } from '../../../../core/services/sales.service';
import { formatCurrency } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';

@Component({
  selector: 'app-sales-dashboard',
  imports: [
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './sales-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesDashboardComponent implements OnInit {
  private readonly sales = inject(SalesService);

  readonly data = signal<SalesDashboardData | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly formatCurrency = formatCurrency;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.sales
      .getDashboard()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => this.data.set(d),
        error: () => this.error.set(true),
      });
  }
}
