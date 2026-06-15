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
      TRADED: 'bg-blue-100 text-blue-800',
      RAW_MATERIAL: 'bg-orange-100 text-orange-800',
      WORK_IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      FINISHED_GOODS: 'bg-green-100 text-green-800',
      MANUFACTURED: 'bg-purple-100 text-purple-800',
      PPE: 'bg-red-100 text-red-800',
      SPARE_PART: 'bg-gray-100 text-gray-800',
      ASSET: 'bg-indigo-100 text-indigo-800',
      SERVICE: 'bg-slate-100 text-slate-600',
    };
    return map[this.type()] ?? 'bg-gray-100 text-gray-800';
  });
}
