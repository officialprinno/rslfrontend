import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormArray,
  UntypedFormBuilder,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
  CreditNote,
  CreditNoteInventoryReviewData,
  SalesCreditAttachmentType,
  SalesReturnCondition,
  SalesReturnDecision,
} from '../../../../core/models/sales.model';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PromptDialogService } from '../../../../core/services/prompt-dialog.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDateTime } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';

@Component({
  selector: 'app-credit-note-view',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    WorkflowStepperComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
  ],
  templateUrl: './credit-note-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditNoteViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sales = inject(SalesService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly prompt = inject(PromptDialogService);
  private readonly fb = inject(UntypedFormBuilder);

  readonly creditNote = signal<CreditNote | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly actionBusy = signal(false);
  readonly uploading = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly steps = [
    'Draft',
    'Sales Submitted',
    'Inventory Reviewed',
    'Finance Reviewed',
    'GM Approved',
    'Applied',
  ] as const;
  readonly formatCurrency = formatCurrency;
  readonly formatDateTime = formatDateTime;

  readonly inspections = this.fb.array([]);
  readonly attachmentForm = this.fb.group({
    caption: [''],
    attachment_type: ['SUPPORTING' as SalesCreditAttachmentType],
  });

  get inspectionRows(): UntypedFormArray {
    return this.inspections;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading.set(true);
    this.error.set(false);
    this.sales
      .getCreditNote(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (creditNote) => {
          this.creditNote.set(creditNote);
          this.buildInspectionForm(creditNote);
        },
        error: (error) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(error));
        },
      });
  }

  workflowIndex(cn: CreditNote): number {
    const map: Record<string, number> = {
      DRAFT: 0,
      SALES_SUBMITTED: 1,
      INVENTORY_REVIEWED: 2,
      FINANCE_REVIEWED: 3,
      GM_APPROVED: 4,
      APPLIED: 5,
      REJECTED: 0,
    };
    return map[cn.workflow_stage || cn.status] ?? 0;
  }

  stage(cn: CreditNote): string {
    return cn.workflow_stage || cn.status;
  }

  typeLabel(cn: CreditNote): string {
    return cn.credit_note_type?.replaceAll('_', ' ') || 'Legacy adjustment';
  }

  submit(cn: CreditNote): void {
    this.confirm
      .open({
        title: 'Submit Credit Note',
        message: `Submit ${cn.cn_number} to Inventory for review?`,
        confirmLabel: 'Submit',
      })
      .subscribe((confirmed) => {
        if (confirmed) this.run(this.sales.submitCreditNote(cn.id), 'Credit note submitted');
      });
  }

  inventoryReview(cn: CreditNote): void {
    const inspections: CreditNoteInventoryReviewData['inspections'] =
      cn.credit_note_type === 'SALES_RETURN'
        ? this.inspections.getRawValue().map((row) => ({
            credit_note_line: Number(row.credit_note_line),
            quantity_confirmed: Number(row.quantity_confirmed),
            condition: row.condition as SalesReturnCondition,
            decision: row.decision as SalesReturnDecision,
            notes: row.notes || '',
          }))
        : [];
    if (cn.credit_note_type === 'SALES_RETURN' && this.inspections.invalid) {
      this.notification.error('Complete the inspection for every returned line.');
      return;
    }
    this.run(
      this.sales.inventoryReviewCreditNote(cn.id, { inspections }),
      'Inventory review completed',
    );
  }

  financeReview(cn: CreditNote): void {
    this.askComments('Complete Finance Review', 'Add optional Finance comments.').subscribe(
      (comments) => {
        if (comments !== null) {
          this.run(
            this.sales.financeReviewCreditNote(cn.id, { comments }),
            'Finance review completed',
          );
        }
      },
    );
  }

  gmApprove(cn: CreditNote): void {
    this.askComments('GM Approval', 'Add optional approval comments.').subscribe((comments) => {
      if (comments !== null) {
        this.run(this.sales.gmApproveCreditNote(cn.id, { comments }), 'Credit note approved by GM');
      }
    });
  }

  reject(cn: CreditNote): void {
    this.prompt
      .open({
        title: 'Reject Credit Note',
        message: 'Provide a clear reason. The request creator will be notified.',
        label: 'Rejection reason',
        required: true,
        multiline: true,
        confirmLabel: 'Reject',
      })
      .subscribe((reason) => {
        if (reason) {
          this.run(this.sales.rejectCreditNote(cn.id, { reason }), 'Credit note rejected');
        }
      });
  }

  apply(cn: CreditNote): void {
    this.confirm
      .open({
        title: 'Apply Credit Note',
        message: `Post ${formatCurrency(cn.amount)} to invoice ${cn.invoice_number}? This creates the journal and stock movements.`,
        confirmLabel: 'Apply and Post',
      })
      .subscribe((confirmed) => {
        if (confirmed) this.run(this.sales.applyCreditNote(cn.id), 'Credit note applied and posted');
      });
  }

  legacyApprove(cn: CreditNote): void {
    this.run(this.sales.approveCreditNote(cn.id), 'Legacy credit note approved');
  }

  chooseFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] || null);
  }

  upload(cn: CreditNote): void {
    const file = this.selectedFile();
    if (!file) {
      this.notification.error('Select a file first.');
      return;
    }
    const raw = this.attachmentForm.getRawValue();
    this.uploading.set(true);
    this.sales
      .uploadCreditNoteAttachment(
        cn.id,
        file,
        raw.caption || '',
        raw.attachment_type || 'SUPPORTING',
      )
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Attachment uploaded');
          this.selectedFile.set(null);
          this.attachmentForm.reset({ caption: '', attachment_type: 'SUPPORTING' });
          this.load();
        },
        error: (error) => this.notification.error(getApiErrorMessage(error)),
      });
  }

  private buildInspectionForm(cn: CreditNote): void {
    this.inspections.clear();
    if (!cn.can_inventory_review || cn.credit_note_type !== 'SALES_RETURN') return;
    for (const line of cn.lines) {
      this.inspections.push(
        this.fb.group({
          credit_note_line: [line.id, Validators.required],
          quantity_confirmed: [Number(line.quantity), [Validators.required, Validators.min(0.0001)]],
          condition: ['GOOD' as SalesReturnCondition, Validators.required],
          decision: ['RETURN_TO_STOCK' as SalesReturnDecision, Validators.required],
          notes: [''],
        }),
      );
    }
  }

  private askComments(title: string, message: string): Observable<string | null> {
    return this.prompt.open({
      title,
      message,
      label: 'Comments',
      multiline: true,
      required: false,
      confirmLabel: 'Continue',
    });
  }

  private run(request: Observable<CreditNote>, successMessage: string): void {
    this.actionBusy.set(true);
    request.pipe(finalize(() => this.actionBusy.set(false))).subscribe({
      next: () => {
        this.notification.success(successMessage);
        this.load();
      },
      error: (error) => this.notification.error(getApiErrorMessage(error)),
    });
  }
}
