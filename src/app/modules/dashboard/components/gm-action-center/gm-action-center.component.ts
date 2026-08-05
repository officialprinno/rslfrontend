import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import {
  GmApprovalCategory,
  GmApprovalItem,
  GmApprovalsData,
} from '../../../../core/models/gm-approvals.models';

@Component({
  selector: 'app-gm-action-center',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './gm-action-center.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GmActionCenterComponent {
  readonly data = input<GmApprovalsData | null>(null);
  readonly loading = input(false);
  readonly refreshing = input(false);
  readonly refresh = output<void>();

  readonly total = computed(() => this.data()?.total ?? 0);
  readonly items = computed(() => this.data()?.items ?? []);
  readonly categories = computed(() => this.data()?.categories ?? []);
  readonly hasWork = computed(() => this.total() > 0);

  moduleLabel(module: string): string {
    const key = `dashboard.gm_action.modules.${module}`;
    return key;
  }

  trackItem(item: GmApprovalItem): string {
    return item.id;
  }

  trackCategory(cat: GmApprovalCategory): string {
    return cat.id;
  }
}
