import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Quotation } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportQuotationPdf, printDocument } from '../../../../core/utils/sales-pdf.util';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { WorkflowStepperComponent } from '../../../procurement/components/workflow-stepper/workflow-stepper.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { COMPANY_DETAILS, WORKFLOW_STEPS } from '../../constants/sales.constants';
import {
  canConvertToSO,
  canCreateQuotation,
  canDeleteAnything,
} from '../../utils/sales-permissions.util';

@Component({
  selector: 'app-quotation-view',
  imports: [
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    WorkflowStepperComponent,
    StatusBadgeComponent,
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
  readonly quotationSteps = WORKFLOW_STEPS.quotation;
  readonly company = COMPANY_DETAILS;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  readonly canManage = () => canCreateQuotation(this.auth);
  readonly canConvert = () => canConvertToSO(this.auth);
  readonly canDelete = () => canDeleteAnything(this.auth);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.sales.getQuotation(id).subscribe({
      next: (q) => this.quotation.set(q),
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  workflowIndex(status: string): number {
    const map: Record<string, number> = {
      DRAFT: 0,
      SENT: 1,
      ACCEPTED: 2,
      REJECTED: 1,
      EXPIRED: 1,
    };
    return map[status] ?? 0;
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
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  accept(): void {
    const q = this.quotation()!;
    this.sales.acceptQuotation(q.id).subscribe({
      next: () => {
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

  convert(): void {
    const q = this.quotation()!;
    this.confirm
      .open({ title: 'Convert to SO', message: 'Create sales order from this quotation?', confirmLabel: 'Convert' })
      .subscribe((ok) => {
        if (!ok) return;
        this.sales.convertToSO(q.id).subscribe({
          next: (so) => {
            this.notification.success('Sales order created');
            void this.router.navigate(['/sales/orders', so.id, 'view']);
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
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
    if (q) exportQuotationPdf(q);
  }
}
