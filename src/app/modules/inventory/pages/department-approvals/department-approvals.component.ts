import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { DepartmentRequest } from '../../../../core/models/inventory.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';

@Component({
  selector: 'app-department-approvals',
  imports: [
    FormsModule,
    PageHeaderComponent,
    InventoryNavComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './department-approvals.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentApprovalsComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly notification = inject(NotificationService);

  readonly queue = signal<DepartmentRequest[]>([]);
  readonly urgent = signal<DepartmentRequest[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly selected = signal<Set<number>>(new Set());
  readonly comment = signal('');
  readonly rejectReason = signal('');
  readonly activeRejectId = signal<number | null>(null);

  readonly formatDateTime = formatDateTime;
  readonly formatNumber = formatNumber;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.inventory
      .getDepartmentRequests({ scope: 'pending_approval', page_size: 100, ordering: '-created_at' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.queue.set(d.results);
          this.selected.set(new Set());
        },
        error: () => this.error.set(true),
      });
    this.inventory
      .getDepartmentRequests({ scope: 'urgent', page_size: 50 })
      .subscribe((d) => this.urgent.set(d.results));
  }

  toggle(id: number, checked: boolean): void {
    const next = new Set(this.selected());
    if (checked) next.add(id);
    else next.delete(id);
    this.selected.set(next);
  }

  approveOne(req: DepartmentRequest): void {
    this.inventory.approveDepartmentRequest(req.id, this.comment()).subscribe({
      next: () => {
        this.notification.success(`${req.request_number} approved`);
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  bulkApprove(): void {
    const ids = [...this.selected()];
    if (!ids.length) {
      this.notification.error('Select at least one request');
      return;
    }
    this.inventory.bulkApproveDepartmentRequests(ids, this.comment()).subscribe({
      next: () => {
        this.notification.success(`Approved ${ids.length} request(s)`);
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  reject(req: DepartmentRequest): void {
    this.activeRejectId.set(req.id);
    this.rejectReason.set('');
  }

  confirmReject(req: DepartmentRequest): void {
    this.inventory.rejectDepartmentRequest(req.id, this.rejectReason()).subscribe({
      next: () => {
        this.notification.success('Request rejected');
        this.activeRejectId.set(null);
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
