import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Product, Shift, WorkOrder } from '../../../../core/models/production.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductionService } from '../../../../core/services/production.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProductionNavComponent } from '../../components/production-nav/production-nav.component';
import { SHIFTS } from '../../constants/production.constants';
import {
  canApproveWO,
  canCreateWorkOrder,
  canDeleteAnything,
  canStartProduction,
} from '../../utils/production-permissions.util';

@Component({
  selector: 'app-wo-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    ProductionNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './wo-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WoListComponent implements OnInit {
  private readonly production = inject(ProductionService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly workOrders = signal<WorkOrder[]>([]);
  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly shiftFilter = signal<Shift | ''>('');
  readonly productFilter = signal<number | ''>('');

  readonly shifts = SHIFTS;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly canAdd = () => canCreateWorkOrder(this.auth);
  readonly canApprove = () => canApproveWO(this.auth);
  readonly canStart = () => canStartProduction(this.auth);
  readonly canDelete = () => canDeleteAnything(this.auth);

  readonly statusOptions = ['DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  readonly shiftLabel = computed(() => {
    const map = Object.fromEntries(SHIFTS.map((s) => [s.value, s.label]));
    return (shift: Shift) => map[shift] ?? shift;
  });

  readonly shiftColor = computed(() => {
    const map = Object.fromEntries(SHIFTS.map((s) => [s.value, s.color]));
    return (shift: Shift) => map[shift] ?? 'bg-gray-100 text-gray-800';
  });

  ngOnInit(): void {
    this.production.getProducts({ page_size: 100, is_active: true }).subscribe((d) => this.products.set(d.results));
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
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.shiftFilter()) params['shift'] = this.shiftFilter();
    if (this.productFilter()) params['product'] = this.productFilter() as number;

    this.production
      .getWorkOrders(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.workOrders.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  submitWo(wo: WorkOrder): void {
    this.confirm
      .open({
        title: 'Submit Work Order',
        message: `Submit ${wo.wo_number} for approval?`,
        confirmLabel: 'Submit',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.production.submitWorkOrder(wo.id).subscribe({
          next: () => {
            this.notification.success('Work order submitted');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  approveWo(wo: WorkOrder): void {
    this.confirm
      .open({
        title: 'Approve Work Order',
        message: `Approve ${wo.wo_number}?`,
        confirmLabel: 'Approve',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.production.approveWorkOrder(wo.id).subscribe({
          next: () => {
            this.notification.success('Work order approved');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  cancelWo(wo: WorkOrder): void {
    this.confirm
      .open({
        title: 'Cancel Work Order',
        message: `Cancel ${wo.wo_number}?`,
        confirmLabel: 'Cancel WO',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.production.cancelWorkOrder(wo.id).subscribe({
          next: () => {
            this.notification.success('Work order cancelled');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  deleteWo(wo: WorkOrder): void {
    this.confirm
      .open({
        title: 'Delete Work Order',
        message: `Permanently delete ${wo.wo_number}?`,
        confirmLabel: 'Delete',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.production.deleteWorkOrder(wo.id).subscribe({
          next: () => {
            this.notification.success('Work order deleted');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }
}
