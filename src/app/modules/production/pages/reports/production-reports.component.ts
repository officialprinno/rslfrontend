import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ProductionReportsBundle } from '../../../../core/models/production.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductionService } from '../../../../core/services/production.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatNumber } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProductionNavComponent } from '../../components/production-nav/production-nav.component';

type ExportKey = 'operator' | 'downtime' | 'utilization' | 'completed';

@Component({
  selector: 'app-production-reports',
  imports: [
    FormsModule,
    PageHeaderComponent,
    ProductionNavComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './production-reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionReportsComponent implements OnInit {
  private readonly production = inject(ProductionService);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly exporting = signal<ExportKey | null>(null);
  readonly month = signal(this.currentMonth());
  readonly data = signal<ProductionReportsBundle | null>(null);

  readonly formatNumber = formatNumber;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.production
      .getProductionReports({ month: this.month(), type: 'all' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => this.data.set(d),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e, 'Failed to load production reports'));
        },
      });
  }

  onMonthChange(value: string): void {
    this.month.set(value);
    this.load();
  }

  exportReport(key: ExportKey): void {
    const bundle = this.data();
    if (!bundle) {
      return;
    }
    this.exporting.set(key);
    const done = () => this.exporting.set(null);
    const suffix = this.month().replace('-', '');

    if (key === 'operator') {
      exportToExcel(
        `operator-performance-${suffix}`,
        [
          { key: 'operator_name', label: 'Operator' },
          { key: 'work_orders_total', label: 'Work Orders' },
          { key: 'work_orders_completed', label: 'Completed' },
          { key: 'quantity_planned', label: 'Planned Qty' },
          { key: 'quantity_produced', label: 'Produced Qty' },
          { key: 'efficiency_pct', label: 'Efficiency %' },
          { key: 'rejection_rate_pct', label: 'Rejection %' },
        ],
        bundle.operator_performance.operators,
      );
      done();
      return;
    }

    if (key === 'downtime') {
      exportToExcel(
        `downtime-by-machine-${suffix}`,
        [
          { key: 'machine_code', label: 'Machine Code' },
          { key: 'machine_name', label: 'Machine' },
          { key: 'pause_count', label: 'Pause Events' },
          { key: 'downtime_minutes', label: 'Downtime (min)' },
        ],
        bundle.downtime.by_machine,
      );
      done();
      return;
    }

    if (key === 'utilization') {
      exportToExcel(
        `machine-utilization-${suffix}`,
        [
          { key: 'machine_code', label: 'Machine Code' },
          { key: 'machine_name', label: 'Machine' },
          { key: 'hours_used', label: 'Hours Used' },
          { key: 'usage_sessions', label: 'Sessions' },
          { key: 'utilization_pct', label: 'Utilization %' },
          { key: 'current_wo', label: 'Current WO' },
        ],
        bundle.machine_utilization.machines,
      );
      done();
      return;
    }

    exportToExcel(
      `completed-work-orders-${suffix}`,
      [
        { key: 'wo_number', label: 'Work Order' },
        { key: 'product_name', label: 'Product' },
        { key: 'operator_name', label: 'Operator' },
        { key: 'quantity_planned', label: 'Planned' },
        { key: 'quantity_produced', label: 'Produced' },
        { key: 'efficiency_pct', label: 'Efficiency %' },
        { key: 'status', label: 'Status' },
      ],
      bundle.completed_work_orders.work_orders,
    );
    done();
  }

  private currentMonth(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  }
}
