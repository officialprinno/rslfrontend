import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import {
  DeptApprovalCategory,
  DeptApprovalItem,
  DeptApprovalsData,
  DeptActionDepartment,
} from '../../../../core/models/dept-approvals.models';

@Component({
  selector: 'app-dept-action-center',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './dept-action-center.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeptActionCenterComponent {
  readonly department = input.required<DeptActionDepartment>();
  readonly data = input<DeptApprovalsData | null>(null);
  readonly loading = input(false);
  readonly refreshing = input(false);
  readonly refresh = output<void>();

  readonly total = computed(() => this.data()?.total ?? 0);
  readonly items = computed(() => this.data()?.items ?? []);
  readonly categories = computed(() => this.data()?.categories ?? []);
  readonly hasWork = computed(() => this.total() > 0);

  readonly titleKey = computed(() => `dashboard.dept_action.${this.department()}.title`);
  readonly eyebrowKey = computed(() => `dashboard.dept_action.${this.department()}.eyebrow`);
  readonly subtitlePendingKey = computed(
    () => `dashboard.dept_action.${this.department()}.subtitle_pending`,
  );
  readonly subtitleClearKey = computed(
    () => `dashboard.dept_action.${this.department()}.subtitle_clear`,
  );

  moduleLabel(module: string): string {
    return `dashboard.gm_action.modules.${module}`;
  }

  trackItem(item: DeptApprovalItem): string {
    return item.id;
  }

  trackCategory(cat: DeptApprovalCategory): string {
    return cat.id;
  }
}
