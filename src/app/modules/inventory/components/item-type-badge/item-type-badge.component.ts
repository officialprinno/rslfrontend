import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ItemType } from '../../../../core/models/inventory.model';

@Component({
  selector: 'app-item-type-badge',
  template: `<span class="badge" [class]="badgeClass()">{{ type() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemTypeBadgeComponent {
  readonly type = input.required<ItemType>();

  readonly badgeClass = computed(() => {
    const map: Record<ItemType, string> = {
      TRADED: 'badge-blue',
      RAW_MATERIAL: 'badge-orange',
      WORK_IN_PROGRESS: 'badge-yellow',
      FINISHED_GOODS: 'badge-green',
      MANUFACTURED: 'badge-purple',
      PPE: 'badge-red',
      SPARE_PART: 'badge-gray',
      ASSET: 'badge-blue',
      SERVICE: 'badge-draft',
    };
    return map[this.type()] ?? 'badge-draft';
  });
}
