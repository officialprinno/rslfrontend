import { DecimalPipe, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ProductionDashboard } from '../../../../core/models/production.model';
import { ProductionService } from '../../../../core/services/production.service';
import { AuthService } from '../../../../core/services/auth.service';
import { formatNumber } from '../../../../core/utils/format.util';
import {
  ChartCardDeferredComponent,
  DashboardInsight,
  DashboardLayoutComponent,
  DashboardSectionComponent,
  DateRangeValue,
  InsightBannerComponent,
  KpiCardComponent,
  setupDashboardCompanyReload,
} from '../../../../shared/dashboard';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ProductionNavComponent } from '../../components/production-nav/production-nav.component';
import { MACHINE_STATUS_BORDER, MATERIAL_STATUS_COLOR } from '../../constants/production.constants';
import { isMachineOperator, isProductionSupervisor } from '../../utils/production-permissions.util';

@Component({
  selector: 'app-production-dashboard',
  imports: [
    DecimalPipe,
    SlicePipe,
    RouterLink,
    ProductionNavComponent,
    StatusBadgeComponent,
    DashboardLayoutComponent,
    InsightBannerComponent,
    KpiCardComponent,
    ChartCardDeferredComponent,
    DashboardSectionComponent,
  ],
  templateUrl: './production-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionDashboardComponent implements OnInit {
  private readonly production = inject(ProductionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly data = signal<ProductionDashboard | null>(null);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal(false);
  readonly lastUpdated = signal<Date | null>(null);
  readonly dateRange = signal<DateRangeValue | null>(null);

  readonly formatNumber = formatNumber;
  readonly materialStatusColor = MATERIAL_STATUS_COLOR;
  readonly machineStatusBorder = MACHINE_STATUS_BORDER;

  readonly insights = computed((): DashboardInsight[] => {
    const d = this.data();
    if (!d) return [];
    const items: DashboardInsight[] = [];

    const lowMaterials = d.raw_material_status.filter(
      (m) => m.status === 'LOW' || m.status === 'INSUFFICIENT',
    );
    if (lowMaterials.length) {
      items.push({
        id: 'materials',
        message: `${lowMaterials.length} raw material(s) below required levels`,
        tone: 'warning',
        route: '/production/work-orders',
      });
    }
    if (d.active_work_orders > 0) {
      items.push({
        id: 'active-wo',
        message: `${d.active_work_orders} active work order(s) · ${d.efficiency_rate}% efficiency`,
        tone: d.efficiency_rate >= 85 ? 'success' : 'info',
        route: '/production/work-orders',
      });
    }
    if (!items.length) {
      items.push({
        id: 'output',
        message: `${formatNumber(d.units_today, 0)} units produced today`,
        tone: 'success',
      });
    }
    return items.slice(0, 4);
  });

  constructor() {
    setupDashboardCompanyReload(() => {
      if (isMachineOperator(this.auth) && !isProductionSupervisor(this.auth)) {
        return;
      }
      this.data.set(null);
      this.load(false, true);
    });
  }

  ngOnInit(): void {
    if (isMachineOperator(this.auth) && !isProductionSupervisor(this.auth)) {
      void this.router.navigate(['/production/operator']);
    }
  }

  load(silent = false, bypassCache = false): void {
    if (silent) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set(false);
    this.production
      .getProductionDashboard(this.dateRange(), bypassCache)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),
      )
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.lastUpdated.set(new Date());
        },
        error: () => this.error.set(true),
      });
  }

  onRefresh(): void {
    this.load(true, true);
  }

  onDateRangeChange(range: DateRangeValue): void {
    this.dateRange.set(range);
    this.load(true);
  }

  maxDailyOutput(): number {
    const days = this.data()?.daily_output ?? [];
    return Math.max(
      ...days.map((d) => Math.max(+d.planned, +d.actual)),
      1,
    );
  }

  machineTypeLabel(type: string): string {
    const map: Record<string, string> = {
      WIRE_DRAWING: 'Wire Drawing',
      MESH_WEAVING: 'Mesh Weaving',
      CUTTING: 'Cutting',
      OTHER: 'Other',
    };
    return map[type] ?? type;
  }
}
