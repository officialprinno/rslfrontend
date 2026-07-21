import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { CreditNote } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { canCreateCreditNote } from '../../utils/sales-permissions.util';

@Component({
  selector: 'app-credit-notes-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './credit-notes-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditNotesListComponent implements OnInit {
  private readonly sales = inject(SalesService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);

  readonly creditNotes = signal<CreditNote[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly workflowStage = signal('');
  readonly creditNoteType = signal('');

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly canCreate = () => canCreateCreditNote(this.auth);

  ngOnInit(): void {
    const requestedId = Number(this.route.snapshot.queryParamMap.get('credit_note'));
    if (requestedId > 0) {
      void this.router.navigate(['/sales/credit-notes', requestedId, 'view'], {
        replaceUrl: true,
      });
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.sales
      .getCreditNotes({
        page: this.page(),
        page_size: 10,
        ordering: '-created_at',
        ...(this.workflowStage() ? { workflow_stage: this.workflowStage() } : {}),
        ...(this.creditNoteType() ? { credit_note_type: this.creditNoteType() } : {}),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.creditNotes.set(data.results);
          this.total.set(data.count);
        },
        error: (error) => this.notification.error(getApiErrorMessage(error)),
      });
  }

  stage(cn: CreditNote): string {
    return cn.workflow_stage || cn.status;
  }

  typeLabel(type: CreditNote['credit_note_type']): string {
    return type ? type.replaceAll('_', ' ') : 'Legacy adjustment';
  }
}
