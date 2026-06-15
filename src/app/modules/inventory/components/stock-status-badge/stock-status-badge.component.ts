import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { StockStatus } from '../../../../core/models/inventory.model';

@Component({
  selector: 'app-stock-status-badge',
  template: `<span class="badge" [class]="badgeClass()">{{ label() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockStatusBadgeComponent {
  readonly status = input.required<StockStatus>();

  readonly label = computed(() => this.status().replace('_', ' '));

  readonly badgeClass = computed(() => {
    const map: Record<StockStatus, string> = {
      IN_STOCK: 'bg-green-100 text-green-800',
      LOW_STOCK: 'bg-orange-100 text-orange-700',
      OUT_OF_STOCK: 'bg-red-100 text-red-700',
    };
    return map[this.status()];
  });
}
