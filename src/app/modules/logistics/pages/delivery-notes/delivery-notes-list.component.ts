import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { DeliveryNote } from '../../../../core/models/logistics.model';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { exportDeliveryNotePdf } from '../../../../core/utils/logistics-pdf.util';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';

@Component({
  selector: 'app-delivery-notes-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    LogisticsNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './delivery-notes-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryNotesListComponent implements OnInit {
  private readonly logistics = inject(LogisticsService);
  private readonly notification = inject(NotificationService);

  readonly notes = signal<DeliveryNote[]>([]);
  readonly loading = signal(true);
  readonly printingId = signal<number | null>(null);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly statusFilter = signal('');

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly statusOptions = ['PENDING', 'SIGNED', 'DISPUTED'];

  ngOnInit(): void {
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

    this.logistics
      .getDeliveryNotes(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.notes.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  printNote(note: DeliveryNote): void {
    this.printingId.set(note.id);
    this.logistics.getDeliveryOrder(note.do_id).subscribe({
      next: (order) => {
        exportDeliveryNotePdf(note, order);
        this.printingId.set(null);
      },
      error: (e) => {
        this.printingId.set(null);
        this.notification.error(getApiErrorMessage(e));
      },
    });
  }
}
