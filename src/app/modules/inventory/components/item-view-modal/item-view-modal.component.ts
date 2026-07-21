import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Item } from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { formatCurrency, formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { canProcessInventoryWorkflows } from '../../../finance/utils/finance-permissions.util';
import { ItemTypeBadgeComponent } from '../item-type-badge/item-type-badge.component';

const FINANCE_WORKFLOW_STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'In Finance queue',
  COSTING_IN_PROGRESS: 'Costing in progress',
  PRICING_IN_PROGRESS: 'Pricing in progress',
  PENDING_FINANCE_APPROVAL: 'Pending approval',
  READY_FOR_SALE: 'Ready for sale',
};

@Component({
  selector: 'app-item-view-modal',
  imports: [ModalComponent, ItemTypeBadgeComponent, StatusBadgeComponent, RouterLink],
  templateUrl: './item-view-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemViewModalComponent {
  private readonly auth = inject(AuthService);

  readonly open = input(false);
  readonly item = input<Item | null>(null);
  readonly stockQty = input(0);

  readonly closed = output<void>();
  readonly edit = output<Item>();

  formatCurrency = formatCurrency;
  formatNumber = formatNumber;
  formatDateTime = formatDateTime;

  canOpenFinancePricing(): boolean {
    return canProcessInventoryWorkflows(this.auth);
  }

  isTradedAwaitingFinance(item: Item): boolean {
    return item.item_type === 'TRADED' && !!item.finance_pricing_pending;
  }

  financeWorkflowStatusLabel(status: string | null | undefined): string {
    if (!status) return 'In Finance queue';
    return FINANCE_WORKFLOW_STATUS_LABELS[status] ?? status;
  }

  onClose(): void {
    this.closed.emit();
  }

  onEdit(): void {
    const item = this.item();
    if (item) this.edit.emit(item);
  }
}
