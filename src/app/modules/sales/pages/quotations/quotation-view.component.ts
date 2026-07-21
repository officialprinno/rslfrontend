import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Quotation, QuotationDocument } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { downloadBlob } from '../../../../core/utils/download.util';
import { printDocument } from '../../../../core/utils/sales-pdf.util';
import { formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { WorkflowStepperComponent } from '../../../procurement/components/workflow-stepper/workflow-stepper.component';
import { QuotationDocumentComponent } from '../../components/quotation-document/quotation-document.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { DELIVERY_METHODS, WORKFLOW_STEPS, quotationIsConvertible, quotationIsEditable } from '../../constants/sales.constants';
import {
  canConvertToSO,
  canCreateQuotation,
  canDeleteAnything,
} from '../../utils/sales-permissions.util';

@Component({
  selector: 'app-quotation-view',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    WorkflowStepperComponent,
    ModalComponent,
    QuotationDocumentComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './quotation-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sales = inject(SalesService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly quotation = signal<Quotation | null>(null);
  readonly document = signal<QuotationDocument | null>(null);
  readonly loading = signal(true);
  readonly exporting = signal(false);
  readonly showConvertModal = signal(false);
  readonly converting = signal(false);
  readonly replying = signal(false);
  salesReplyMessage = '';
  readonly quotationSteps = WORKFLOW_STEPS.quotation;
  readonly deliveryMethods = DELIVERY_METHODS;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  readonly canManage = () => canCreateQuotation(this.auth);
  readonly canConvert = () => canConvertToSO(this.auth);
  readonly canDelete = () => canDeleteAnything(this.auth);
  readonly isDraft = (q: Quotation) => quotationIsEditable(q);
  readonly isConvertible = (q: Quotation) => quotationIsConvertible(q);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.loading.set(true);
    this.sales.getQuotation(id).subscribe({
      next: (q) => {
        this.quotation.set(q);
        this.salesReplyMessage = q.sales_reply ?? '';
        this.sales
          .getQuotationDocument(id)
          .pipe(finalize(() => this.loading.set(false)))
          .subscribe({
            next: (doc) => this.document.set(doc),
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
      },
      error: (e) => {
        this.loading.set(false);
        this.notification.error(getApiErrorMessage(e));
      },
    });
  }

  workflowIndex(status: string): number {
    const map: Record<string, number> = {
      DRAFT: 0,
      SENT: 1,
      QUOTATION_SENT: 1,
      WAITING_CUSTOMER: 1,
      ACCEPTED: 2,
      QUOTATION_ACCEPTED: 2,
      REJECTED: 1,
      QUOTATION_REJECTED: 1,
      QUOTATION_REVISION: 1,
      EXPIRED: 1,
    };
    return map[status] ?? 0;
  }

  isAwaitingCustomer(status: string): boolean {
    return ['SENT', 'QUOTATION_SENT', 'WAITING_CUSTOMER'].includes(status);
  }

  isAccepted(status: string): boolean {
    return ['ACCEPTED', 'QUOTATION_ACCEPTED'].includes(status);
  }

  customerResponseLabel(response?: string | null): string {
    const map: Record<string, string> = {
      ACCEPTED: 'Accepted',
      REJECTED: 'Rejected',
      REVISION: 'Revision Requested',
    };
    return response ? (map[response] ?? response) : '—';
  }

  needsSalesReply(q: Quotation): boolean {
    return (
      (q.customer_response === 'REVISION' || q.customer_response === 'REJECTED') &&
      !q.sales_reply
    );
  }

  hasCustomerFeedback(q: Quotation): boolean {
    return !!q.customer_response && (q.customer_response === 'REVISION' || q.customer_response === 'REJECTED');
  }

  submitSalesReply(): void {
    const q = this.quotation();
    if (!q) return;
    const message = this.salesReplyMessage.trim();
    if (!message) {
      this.notification.error('Enter a reply message for the customer.');
      return;
    }
    this.replying.set(true);
    this.sales
      .replyToQuotationCustomer(q.id, message)
      .pipe(finalize(() => this.replying.set(false)))
      .subscribe({
        next: (updated) => {
          this.quotation.set(updated);
          this.salesReplyMessage = updated.sales_reply ?? message;
          this.notification.success('Reply saved. Customer can view it on the quotation portal.');
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  send(): void {
    const q = this.quotation();
    if (!q) return;
    this.confirm
      .open({ title: 'Send Quotation', message: 'Send to customer?', confirmLabel: 'Send' })
      .subscribe((ok) => {
        if (!ok) return;
        this.sales.sendQuotation(q.id).subscribe({
          next: () => {
            this.notification.success('Quotation sent');
            this.load();
          },
        });
      });
  }

  accept(): void {
    const q = this.quotation()!;
    this.sales.acceptQuotation(q.id).subscribe({
      next: (updated) => {
        const delivery = this.quotationDeliveryMethod(updated);
        if (delivery && this.isConvertible(updated)) {
          this.performConvert(updated, delivery, true);
          return;
        }
        this.notification.success('Quotation accepted');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  reject(): void {
    const q = this.quotation()!;
    this.sales.rejectQuotation(q.id).subscribe({
      next: () => {
        this.notification.success('Quotation rejected');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  convertDeliveryMethod: 'PICKUP' | 'COMPANY' | 'THIRD_PARTY' = 'COMPANY';

  convert(): void {
    const q = this.quotation()!;
    if (q.has_sales_order && q.sales_order_id) {
      void this.router.navigate(['/sales/orders', q.sales_order_id, 'view']);
      return;
    }
    const delivery = this.quotationDeliveryMethod(q);
    if (delivery) {
      this.performConvert(q, delivery);
      return;
    }
    this.convertDeliveryMethod = 'COMPANY';
    this.showConvertModal.set(true);
  }

  submitConvert(): void {
    const q = this.quotation();
    if (!q) return;
    this.performConvert(q, this.convertDeliveryMethod);
  }

  private quotationDeliveryMethod(
    q: Quotation,
  ): 'PICKUP' | 'COMPANY' | 'THIRD_PARTY' | null {
    const method = q.delivery_method;
    if (method === 'PICKUP' || method === 'COMPANY' || method === 'THIRD_PARTY') {
      return method;
    }
    return null;
  }

  private performConvert(
    q: Quotation,
    deliveryMethod: 'PICKUP' | 'COMPANY' | 'THIRD_PARTY',
    fromAccept = false,
  ): void {
    this.converting.set(true);
    this.sales
      .convertToSO(q.id, { delivery_method: deliveryMethod })
      .pipe(finalize(() => this.converting.set(false)))
      .subscribe({
        next: (so) => {
          this.showConvertModal.set(false);
          if (fromAccept) {
            this.notification.success(
              so.so_number
                ? `Quotation accepted — sales order ${so.so_number} created`
                : 'Quotation accepted — sales order created',
            );
          } else {
            this.notification.success(
              so.so_number ? `Sales order ${so.so_number} ready` : 'Sales order created',
            );
          }
          void this.router.navigate(['/sales/orders', so.id, 'view']);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  duplicate(): void {
    const q = this.quotation()!;
    this.sales.duplicateQuotation(q.id).subscribe({
      next: (copy) => {
        this.notification.success('Quotation duplicated');
        void this.router.navigate(['/sales/quotations', copy.id, 'edit']);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  deleteQuotation(): void {
    const q = this.quotation()!;
    this.confirm
      .open({ title: 'Delete', message: 'Delete this quotation?', confirmLabel: 'Delete', confirmDanger: true })
      .subscribe((ok) => {
        if (!ok) return;
        this.sales.deleteQuotation(q.id).subscribe({
          next: () => {
            this.notification.success('Deleted');
            void this.router.navigate(['/sales/quotations']);
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  printQuotation(): void {
    printDocument('quotation-print-area');
  }

  exportPdf(): void {
    const q = this.quotation();
    if (!q) return;
    this.exporting.set(true);
    this.sales
      .downloadQuotationPdf(q.id)
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (blob) => downloadBlob(blob, `${q.quotation_number}.pdf`),
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to generate PDF')),
      });
  }
}
