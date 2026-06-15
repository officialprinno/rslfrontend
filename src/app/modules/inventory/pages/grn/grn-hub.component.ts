import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { GoodsReceivedNote } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { canManageGRN } from '../../../procurement/utils/procurement-permissions.util';

@Component({
  selector: 'app-grn-hub',
  imports: [
    RouterLink,
    PageHeaderComponent,
    InventoryNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './grn-hub.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrnHubComponent implements OnInit {
  private readonly procurement = inject(ProcurementService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly grns = signal<GoodsReceivedNote[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly formatDate = formatDate;
  readonly canConfirm = () => canManageGRN(this.auth);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.procurement
      .getGRNs({ page: this.page(), page_size: this.pageSize() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => { this.grns.set(d.results); this.total.set(d.count); },
        error: () => this.error.set(true),
      });
  }

  confirm(grn: GoodsReceivedNote): void {
    this.procurement.confirmGRN(grn.id).subscribe({
      next: (result) => {
        const summary = result.stock_updates.map((u) => `${u.item}: +${u.quantity}`).join(', ');
        this.notification.success(`GRN confirmed. Stock updated: ${summary}`);
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
