import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FinanceInvoiceDetail } from '../../../../core/models/finance.model';
import { Invoice } from '../../../../core/models/sales.model';
import { SupplierInvoice } from '../../../../core/models/procurement.model';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-finance-invoice-detail-modal',
  imports: [ModalComponent, StatusBadgeComponent],
  templateUrl: './finance-invoice-detail-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceInvoiceDetailModalComponent {
  readonly open = input(false);
  readonly loading = input(false);
  readonly detail = input<FinanceInvoiceDetail<SupplierInvoice | Invoice> | null>(null);
  readonly canApproveActions = input(false);

  readonly close = output<void>();
  readonly approve = output<void>();
  readonly reject = output<void>();

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  asSupplier(inv: SupplierInvoice | Invoice): SupplierInvoice {
    return inv as SupplierInvoice;
  }

  asSales(inv: SupplierInvoice | Invoice): Invoice {
    return inv as Invoice;
  }

  approvalLabel(status?: string): string {
    switch (status) {
      case 'PENDING_FINANCE_APPROVAL':
        return 'Pending Finance';
      case 'APPROVED':
        return 'Finance Approved';
      case 'REJECTED':
        return 'Finance Rejected';
      default:
        return 'Not Submitted';
    }
  }
}
