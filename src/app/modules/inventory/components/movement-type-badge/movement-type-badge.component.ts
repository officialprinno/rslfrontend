import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MovementType } from '../../../../core/models/inventory.model';

@Component({
  selector: 'app-movement-type-badge',
  template: `<span class="badge" [class]="badgeClass()">{{ type() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementTypeBadgeComponent {
  readonly type = input.required<MovementType>();

  readonly badgeClass = computed(() => {
    const map: Record<MovementType, string> = {
      IN: 'bg-green-100 text-green-800',
      OUT: 'bg-red-100 text-red-700',
      TRANSFER: 'bg-blue-100 text-blue-800',
      ADJUSTMENT: 'bg-orange-100 text-orange-800',
      PRODUCTION_CONSUMPTION: 'bg-purple-100 text-purple-800',
      PRODUCTION_OUTPUT: 'bg-teal-100 text-teal-800',
    };
    return map[this.type()];
  });
}
