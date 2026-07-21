import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { InventorySalesOrderDetail } from '../../../../core/models/inventory.model';
import { SOStockCheck } from '../../../../core/models/sales.model';
import { printDocument } from '../../../../core/utils/sales-pdf.util';
import { COMPANY_DETAILS } from '../../../sales/constants/sales.constants';

export type InvSoPrintKind = 'stock' | 'pickup' | 'handover';

@Component({
  selector: 'app-inv-so-workflow-print',
  imports: [DatePipe],
  templateUrl: './inv-so-workflow-print.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvSoWorkflowPrintComponent {
  readonly kind = input.required<InvSoPrintKind>();
  readonly order = input.required<InventorySalesOrderDetail>();
  readonly stockCheck = input<SOStockCheck | null>(null);

  readonly company = COMPANY_DETAILS;
  readonly printedAt = new Date();
  readonly printId = computed(() => `inv-so-print-${this.kind()}-${this.order().id}`);

  readonly title = computed(() => {
    switch (this.kind()) {
      case 'stock':
        return 'Physical Stock Verification Sheet';
      case 'pickup':
        return 'Customer Pickup Checklist';
      case 'handover':
        return this.order().delivery_method === 'THIRD_PARTY'
          ? 'Carrier Handover Checklist'
          : 'Driver Handover Checklist';
    }
  });

  print(): void {
    printDocument(this.printId());
  }
}
