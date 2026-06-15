import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Item } from '../../../../core/models/inventory.model';
import { formatCurrency, formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ItemTypeBadgeComponent } from '../item-type-badge/item-type-badge.component';

@Component({
  selector: 'app-item-view-modal',
  imports: [ModalComponent, ItemTypeBadgeComponent, StatusBadgeComponent],
  templateUrl: './item-view-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemViewModalComponent {
  readonly open = input(false);
  readonly item = input<Item | null>(null);
  readonly stockQty = input(0);

  readonly closed = output<void>();
  readonly edit = output<Item>();

  formatCurrency = formatCurrency;
  formatNumber = formatNumber;
  formatDateTime = formatDateTime;

  onClose(): void {
    this.closed.emit();
  }

  onEdit(): void {
    const item = this.item();
    if (item) this.edit.emit(item);
  }
}
