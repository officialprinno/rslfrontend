import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PRPriority } from '../../../../core/models/procurement.model';

@Component({
  selector: 'app-priority-badge',
  template: `<span class="badge" [class]="badgeClass()">{{ priority() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityBadgeComponent {
  readonly priority = input.required<PRPriority>();

  readonly badgeClass = computed(() => {
    const map: Record<PRPriority, string> = {
      LOW: 'bg-gray-100 text-gray-700',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-700',
    };
    return map[this.priority()] ?? 'bg-gray-100 text-gray-700';
  });
}
