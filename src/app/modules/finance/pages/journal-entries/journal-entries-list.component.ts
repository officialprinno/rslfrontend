import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { JournalEntry } from '../../../../core/models/finance.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { formatAccountingAmount, JE_REFERENCE_TYPES } from '../../constants/finance.constants';
import { canCreateJournal, canPostJournal } from '../../utils/finance-permissions.util';

@Component({
  selector: 'app-journal-entries-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    FinanceNavComponent,
    PaginationComponent,
    ModalComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './journal-entries-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalEntriesListComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly entries = signal<JournalEntry[]>([]);
  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly referenceFilter = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly showView = signal(false);
  readonly viewing = signal<JournalEntry | null>(null);

  readonly formatAccountingAmount = formatAccountingAmount;
  readonly formatDate = formatDate;
  readonly referenceTypes = JE_REFERENCE_TYPES;
  readonly statusOptions = ['DRAFT', 'POSTED', 'REVERSED'];
  readonly canAdd = () => canCreateJournal(this.auth);
  readonly canPost = () => canPostJournal(this.auth);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 20,
      ordering: '-date',
    };
    if (this.search()) params['search'] = this.search();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.referenceFilter()) params['reference_type'] = this.referenceFilter();
    if (this.dateFrom()) params['date_from'] = this.dateFrom();
    if (this.dateTo()) params['date_to'] = this.dateTo();

    this.finance
      .getJournalEntries(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.entries.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openView(entry: JournalEntry): void {
    this.viewing.set(entry);
    this.showView.set(true);
    this.detailLoading.set(true);
    this.finance
      .getJournalEntry(entry.id)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (je) => this.viewing.set(je),
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to load entry')),
      });
  }

  postEntry(entry: JournalEntry): void {
    this.confirm
      .open({
        title: 'Post Journal Entry',
        message: `Post ${entry.je_number}? This action cannot be undone.`,
        confirmLabel: 'Post',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.finance.postJournalEntry(entry.id).subscribe({
          next: () => {
            this.notification.success('Journal entry posted');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  reverseEntry(entry: JournalEntry): void {
    this.confirm
      .open({
        title: 'Reverse Journal Entry',
        message: `Reverse ${entry.je_number}? A reversing entry will be created.`,
        confirmLabel: 'Reverse',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.finance.reverseJournalEntry(entry.id).subscribe({
          next: () => {
            this.notification.success('Journal entry reversed');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }
}
