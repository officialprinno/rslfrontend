import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Machine, MachineHistory } from '../../../../core/models/production.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductionService } from '../../../../core/services/production.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProductionNavComponent } from '../../components/production-nav/production-nav.component';
import { MACHINE_STATUSES, MACHINE_TYPES } from '../../constants/production.constants';

type MachineTab = 'overview' | 'usage' | 'service' | 'breakdowns';

@Component({
  selector: 'app-machine-detail',
  imports: [
    DecimalPipe,
    RouterLink,
    PageHeaderComponent,
    ProductionNavComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './machine-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MachineDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly production = inject(ProductionService);
  private readonly notification = inject(NotificationService);

  readonly machine = signal<Machine | null>(null);
  readonly history = signal<MachineHistory | null>(null);
  readonly loading = signal(true);
  readonly historyLoading = signal(false);
  readonly historyError = signal(false);
  readonly error = signal(false);
  readonly activeTab = signal<MachineTab>('overview');

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  readonly tabs: { id: MachineTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'usage', label: 'Usage History' },
    { id: 'service', label: 'Service History' },
    { id: 'breakdowns', label: 'Breakdowns' },
  ];

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab') as MachineTab | null;
    if (tab && this.tabs.some((t) => t.id === tab)) {
      this.activeTab.set(tab);
    }
    this.loadMachine();
  }

  machineId(): number {
    return +this.route.snapshot.paramMap.get('id')!;
  }

  loadMachine(): void {
    this.loading.set(true);
    this.error.set(false);
    this.production
      .getMachine(this.machineId())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (m) => {
          this.machine.set(m);
          if (this.activeTab() !== 'overview') this.loadHistory();
        },
        error: () => this.error.set(true),
      });
  }

  setTab(tab: MachineTab): void {
    this.activeTab.set(tab);
    if (tab !== 'overview' && (!this.history() || this.historyError())) {
      this.loadHistory();
    }
  }

  loadHistory(): void {
    if (this.historyLoading()) {
      return;
    }
    this.historyLoading.set(true);
    this.historyError.set(false);
    this.production
      .getMachineHistory(this.machineId())
      .pipe(finalize(() => this.historyLoading.set(false)))
      .subscribe({
        next: (h) => {
          this.history.set(h);
          this.historyError.set(false);
        },
        error: (e) => {
          this.historyError.set(true);
          this.notification.error(getApiErrorMessage(e, 'Failed to load machine history'));
        },
      });
  }

  typeLabel(type: string): string {
    return MACHINE_TYPES.find((t) => t.value === type)?.label ?? type;
  }

  statusLabel(status: string): string {
    return MACHINE_STATUSES.find((s) => s.value === status)?.label ?? status;
  }
}
