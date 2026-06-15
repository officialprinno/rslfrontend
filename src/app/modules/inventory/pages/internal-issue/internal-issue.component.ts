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
  selector: 'app-internal-issue',
  imports: [
    FormsModule,
    PageHeaderComponent,
    InventoryNavComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './internal-issue.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InternalIssueComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly notification = inject(NotificationService);

  readonly queue = signal<DepartmentRequest[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly issuing = signal<number | null>(null);
  readonly issueQty = signal<Record<number, number>>({});

  readonly formatDateTime = formatDateTime;
  readonly formatNumber = formatNumber;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.inventory
      .getDepartmentRequests({ scope: 'pending_issue', page_size: 100, ordering: 'needed_by_date' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => this.queue.set(d.results),
        error: () => this.error.set(true),
      });
  }

  setIssueQty(lineId: number, value: number): void {
    this.issueQty.update((m) => ({ ...m, [lineId]: value }));
  }

  issueFull(req: DepartmentRequest): void {
    this.issuing.set(req.id);
    this.inventory
      .issueDepartmentRequest(req.id)
      .pipe(finalize(() => this.issuing.set(null)))
      .subscribe({
        next: () => {
          this.notification.success('Stock issued and GIN generated');
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  issuePartial(req: DepartmentRequest): void {
    const lines = req.lines
      .map((line) => ({
        line_id: line.id,
        quantity: this.issueQty()[line.id] ?? line.remaining_qty ?? line.requested_qty ?? line.quantity,
      }))
      .filter((l) => l.quantity > 0);

    this.issuing.set(req.id);
    this.inventory
      .issueDepartmentRequestPartial(req.id, lines)
      .pipe(finalize(() => this.issuing.set(null)))
      .subscribe({
        next: () => {
          this.notification.success('Partial issue completed');
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  isLowStock(line: DepartmentRequest['lines'][0]): boolean {
    const avail = line.available_stock ?? 0;
    const need = line.remaining_qty ?? line.requested_qty ?? line.quantity;
    return avail < need;
  }
}
