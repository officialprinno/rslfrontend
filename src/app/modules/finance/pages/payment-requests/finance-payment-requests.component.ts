import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { PaymentRelease } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import {
  canExecutePaymentRelease,
  canFinanceVerifyPayment,
  canGmApprovePaymentRelease,
} from '../../../procurement/utils/procurement-permissions.util';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';

@Component({
  selector: 'app-finance-payment-requests',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './finance-payment-requests.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancePaymentRequestsComponent implements OnInit {
  private readonly procurement = inject(ProcurementService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  readonly releases = signal<PaymentRelease[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly statusFilter = signal('PENDING_FINANCE');

  readonly formatCurrency = formatCurrency;
  readonly formatDateTime = formatDateTime;
  readonly canVerify = () => canFinanceVerifyPayment(this.auth);
  readonly canExecute = () => canExecutePaymentRelease(this.auth);
  readonly canGm = () => canGmApprovePaymentRelease(this.auth);

  ngOnInit(): void {
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status) {
      this.statusFilter.set(status);
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 10,
    };
    if (this.statusFilter()) {
      params['status'] = this.statusFilter();
    }

    this.procurement
      .getPaymentReleases(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.releases.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
