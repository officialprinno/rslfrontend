import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AlertType } from '../../../../core/models/inventory.model';

@Component({
  selector: 'app-alert-type-badge',
  template: `<span class="badge" [class]="badgeClass()">{{ label() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertTypeBadgeComponent {
  readonly type = input.required<AlertType>();

  readonly label = computed(() => this.type().replace('_', ' '));

  readonly badgeClass = computed(() => {
    const map: Record<AlertType, string> = {
      LOW_STOCK: 'bg-orange-100 text-orange-700',
      OUT_OF_STOCK: 'bg-red-100 text-red-700',
      EXPIRY_SOON: 'bg-yellow-100 text-yellow-800',
      OVERSTOCK: 'bg-blue-100 text-blue-800',
      NEGATIVE_STOCK: 'bg-red-100 text-red-900',
      PENDING_APPROVAL: 'bg-purple-100 text-purple-800',
    };
    return map[this.type()];
  });
}
