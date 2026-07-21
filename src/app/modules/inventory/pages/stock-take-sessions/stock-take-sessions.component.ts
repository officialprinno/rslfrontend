import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  StockTakeSession,
  StockTakeSessionPreview,
  StockTakeWarehouseOption,
} from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { canStartStockTakeSession, canManageStockTakeSettings } from '../../utils/inventory-permissions.util';

@Component({
  selector: 'app-stock-take-sessions',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    InventoryNavComponent,
    ModalComponent,
    PaginationComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './stock-take-sessions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockTakeSessionsComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  readonly sessions = signal<StockTakeSession[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  readonly showWarehouseModal = signal(false);
  readonly warehouseOptions = signal<StockTakeWarehouseOption[]>([]);
  readonly warehousesLoading = signal(false);
  readonly selectedWarehouseId = signal<number | null>(null);
  readonly preview = signal<StockTakeSessionPreview | null>(null);
  readonly previewLoading = signal(false);
  readonly starting = signal(false);
  readonly startNotes = signal('');
  readonly allowOutsideWindow = signal(false);
  readonly withinWindow = signal(false);
  readonly canManageSettings = signal(false);
  readonly savingSettings = signal(false);

  readonly formatDateTime = formatDateTime;
  readonly formatNumber = formatNumber;
  readonly canStart = () => canStartStockTakeSession(this.auth);
  readonly canManageWindow = () => canManageStockTakeSettings(this.auth);

  ngOnInit(): void {
    this.load();
    this.loadSettings();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.inventory
      .getStockTakeSessions({
        page: this.page(),
        page_size: this.pageSize(),
        ordering: '-created_at',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.sessions.set(d.results);
          this.total.set(d.count);
        },
        error: () => this.error.set(true),
      });
  }

  loadSettings(): void {
    if (!this.canManageWindow()) return;
    this.inventory.getStockTakeSettings().subscribe({
      next: (settings) => this.allowOutsideWindow.set(settings.allow_outside_window),
      error: () => {
        /* non-blocking: page still usable without settings banner */
      },
    });
  }

  openStart(): void {
    this.selectedWarehouseId.set(null);
    this.preview.set(null);
    this.startNotes.set('');
    this.showWarehouseModal.set(true);
    this.warehousesLoading.set(true);
    this.inventory
      .getStockTakeSessionWarehouses()
      .pipe(finalize(() => this.warehousesLoading.set(false)))
      .subscribe({
        next: (payload) => {
          this.warehouseOptions.set(payload.warehouses);
          this.allowOutsideWindow.set(payload.allow_outside_window);
          this.withinWindow.set(payload.within_window);
          this.canManageSettings.set(payload.can_manage_settings);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  toggleAllowOutsideWindow(enabled: boolean): void {
    if (!this.canManageWindow() || this.savingSettings()) return;
    const previous = this.allowOutsideWindow();
    this.allowOutsideWindow.set(enabled);
    this.savingSettings.set(true);
    this.inventory
      .updateStockTakeSettings({ allow_outside_window: enabled })
      .pipe(finalize(() => this.savingSettings.set(false)))
      .subscribe({
        next: (settings) => {
          this.allowOutsideWindow.set(settings.allow_outside_window);
          this.notification.success(
            settings.allow_outside_window
              ? 'Stock take open anytime enabled'
              : 'Stock take restricted to monthly window',
          );
          // Refresh picker options so can_start_new updates.
          if (this.showWarehouseModal()) {
            this.inventory.getStockTakeSessionWarehouses().subscribe({
              next: (payload) => {
                this.warehouseOptions.set(payload.warehouses);
                this.allowOutsideWindow.set(payload.allow_outside_window);
                this.withinWindow.set(payload.within_window);
                const selected = this.selectedWarehouseId();
                if (selected) this.onWarehousePicked(selected);
              },
            });
          }
        },
        error: (e) => {
          this.allowOutsideWindow.set(previous);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  onWarehousePicked(id: number | null): void {
    this.selectedWarehouseId.set(id);
    this.preview.set(null);
    if (!id) return;
    this.previewLoading.set(true);
    this.inventory
      .getStockTakeSessionPreview(id)
      .pipe(finalize(() => this.previewLoading.set(false)))
      .subscribe({
        next: (p) => this.preview.set(p),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  selectedWarehouse(): StockTakeWarehouseOption | undefined {
    const id = this.selectedWarehouseId();
    return id ? this.warehouseOptions().find((w) => w.id === id) : undefined;
  }

  canConfirmStart(): boolean {
    const wh = this.selectedWarehouse();
    if (!wh) return false;
    return wh.can_resume || wh.can_start_new;
  }

  confirmStart(): void {
    const warehouseId = this.selectedWarehouseId();
    if (!warehouseId || !this.canConfirmStart()) return;
    this.starting.set(true);
    this.inventory
      .startStockTakeSession({
        warehouse: warehouseId,
        notes: this.startNotes().trim(),
      })
      .pipe(finalize(() => this.starting.set(false)))
      .subscribe({
        next: (session) => {
          this.notification.success(`Stock take ${session.session_number} ready`);
          this.showWarehouseModal.set(false);
          void this.router.navigate(['/inventory/stock-take', session.id]);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  periodLabel(session: StockTakeSession): string {
    return `${session.period_month}/${session.period_year}`;
  }
}
