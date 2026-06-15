import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { CreditNote, CreditNoteFormData, Invoice } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { canApproveCreditNote, canManageInvoice } from '../../utils/sales-permissions.util';

@Component({
  selector: 'app-credit-notes-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    SalesNavComponent,
    PaginationComponent,
    ModalComponent,
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
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  readonly creditNotes = signal<CreditNote[]>([]);
  readonly invoices = signal<Invoice[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly showCreate = signal(false);

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly canCreate = () => canManageInvoice(this.auth);
  readonly canApprove = () => canApproveCreditNote(this.auth);

  readonly createForm = this.fb.group({
    invoice: [null as number | null, Validators.required],
    reason: ['', Validators.required],
    amount: [0, Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    this.sales.getInvoices({ page_size: 100 }).subscribe((d) => this.invoices.set(d.results));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.sales
      .getCreditNotes({ page: this.page(), page_size: 10, ordering: '-created_at' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.creditNotes.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openCreate(): void {
    this.createForm.reset({ amount: 0 });
    this.showCreate.set(true);
  }

  onInvoiceSelect(invoiceId: number | null): void {
    this.createForm.patchValue({ invoice: invoiceId });
    const inv = this.invoices().find((i) => i.id === invoiceId);
    if (inv) {
      this.createForm.patchValue({ amount: Number(inv.total_amount) });
    }
  }

  saveCreditNote(): void {
    if (this.createForm.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.createForm.getRawValue();
    const payload: CreditNoteFormData = {
      invoice: raw.invoice!,
      reason: raw.reason!,
      amount: Number(raw.amount),
      notes: raw.notes ?? '',
    };
    this.saving.set(true);
    this.sales
      .createCreditNote(payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Credit note created');
          this.showCreate.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  approve(cn: CreditNote): void {
    this.confirm
      .open({
        title: 'Approve Credit Note',
        message: `Approve ${cn.cn_number} for ${formatCurrency(cn.amount)}?`,
        confirmLabel: 'Approve',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.sales.approveCreditNote(cn.id).subscribe({
          next: () => {
            this.notification.success('Credit note approved');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  apply(cn: CreditNote): void {
    this.confirm
      .open({
        title: 'Apply Credit Note',
        message: `Apply ${cn.cn_number} to customer account?`,
        confirmLabel: 'Apply',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.sales.applyCreditNote(cn.id).subscribe({
          next: () => {
            this.notification.success('Credit note applied');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }
}
