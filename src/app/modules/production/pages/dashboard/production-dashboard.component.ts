import { DecimalPipe, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ProductionDashboard } from '../../../../core/models/production.model';
import { ProductionService } from '../../../../core/services/production.service';
import { AuthService } from '../../../../core/services/auth.service';
import { formatNumber } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProductionNavComponent } from '../../components/production-nav/production-nav.component';
import { MACHINE_STATUS_BORDER, MATERIAL_STATUS_COLOR } from '../../constants/production.constants';
import { isMachineOperator, isProductionSupervisor } from '../../utils/production-permissions.util';

@Component({
  selector: 'app-production-dashboard',
  imports: [
    DecimalPipe,
    SlicePipe,
    RouterLink,
    PageHeaderComponent,
    ProductionNavComponent,
    StatusBadgeComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './production-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionDashboardComponent implements OnInit, OnDestroy {
  private readonly production = inject(ProductionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private refreshSub?: Subscription;

  readonly data = signal<ProductionDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly formatNumber = formatNumber;
  readonly materialStatusColor = MATERIAL_STATUS_COLOR;
  readonly machineStatusBorder = MACHINE_STATUS_BORDER;

  ngOnInit(): void {
    if (isMachineOperator(this.auth) && !isProductionSupervisor(this.auth)) {
      void this.router.navigate(['/production/operator']);
      return;
    }
    this.load();
    this.refreshSub = interval(30_000).subscribe(() => this.load(true));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  load(silent = false): void {
    if (!silent) {
      this.loading.set(true);
      this.error.set(false);
    }
    this.production
      .getProductionDashboard()
      .pipe(finalize(() => {
        if (!silent) this.loading.set(false);
      }))
      .subscribe({
        next: (d) => this.data.set(d),
        error: () => {
          if (!silent) this.error.set(true);
        },
      });
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
