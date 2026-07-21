import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

@Component({
  selector: 'app-status-badge',
  template: `
    <span class="badge" [class]="badgeClass()">
      {{ displayLabel() }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  private readonly translate = inject(TranslateService);

  readonly status = input.required<string>();
  readonly label = input<string>('');

  private readonly langTick = toSignal(
    this.translate.onLangChange.pipe(map((e) => e.lang)),
    { initialValue: this.translate.getCurrentLang() || 'en' },
  );

  readonly displayLabel = computed(() => {
    this.langTick();
    if (this.label()) return this.label();
    const key = `status.${this.status().toUpperCase().replace(/\s+/g, '_')}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : this.status();
  });

  readonly badgeClass = computed(() => {
    const key = this.status().toUpperCase().replace(/\s+/g, '_');
    const map: Record<string, string> = {
      PENDING_FINANCE: 'badge-pending',
      PENDING_GM: 'badge-pending',
      PENDING_REVIEW: 'badge-pending',
      PENDING: 'badge-pending',
      SALES_SUBMITTED: 'badge-pending',
      INVENTORY_REVIEWED: 'badge-blue',
      FINANCE_REVIEWED: 'badge-blue',
      GM_APPROVED: 'badge-approved',
      APPLIED: 'badge-completed',
      FROZEN: 'badge-blue',
      RELEASED: 'badge-paid',
      APPROVED: 'badge-approved',
      REJECTED: 'badge-rejected',
      DRAFT: 'badge-draft',
      ACTIVE: 'badge-active',
      INACTIVE: 'badge-cancelled',
      CANCELLED: 'badge-cancelled',
      PARTIAL: 'badge-partial',
      PAID: 'badge-paid',
      OVERDUE: 'badge-overdue',
      IN_TRANSIT: 'badge-in_transit',
      MANUFACTURING: 'badge-blue',
      PRODUCTION: 'badge-purple',
      ACKNOWLEDGED: 'badge-confirmed',
      AWAITING: 'badge-pending',
      DELAYED: 'badge-overdue',
      CUSTOM: 'badge-gray',
      DISPATCHED: 'badge-yellow',
      AWAITING_HANDOVER: 'badge-pending',
      HANDED_OVER: 'badge-paid',
      DELIVERED: 'badge-delivered',
      ASSIGNED: 'badge-pending',
      STARTED: 'badge-blue',
      ARRIVED: 'badge-purple',
      RETURNING: 'badge-yellow',
      RETURN_CONFIRMED: 'badge-completed',
      ON_DELIVERY: 'badge-in_transit',
      OFF_DUTY: 'badge-gray',
      GOOD: 'badge-green',
      BREAKDOWN: 'badge-red',
      CONFIRMED: 'badge-confirmed',
      COMPLETED: 'badge-completed',
      COUNTING: 'badge-blue',
      UPLOADED: 'badge-pending',
      REVIEWED: 'badge-blue',
      PENDING_GM_APPROVAL: 'badge-pending',
      ADJUSTED: 'badge-purple',
      LOW_STOCK: 'badge-low_stock',
      OUT_STOCK: 'badge-out_stock',
      OPEN: 'badge-approved',
      CLOSED: 'badge-draft',
      SENT: 'badge-in_transit',
      RECEIVED: 'badge-completed',
      SELECTED: 'badge-approved',
      PO_GENERATED: 'badge-completed',
      RESPONDED: 'badge-blue',
      UNDER_REVIEW: 'badge-pending',
      NO_RESPONSE: 'badge-gray',
      INVITED: 'badge-draft',
      POSTED: 'badge-confirmed',
      PROCESSING: 'badge-pending',
      FAILED: 'badge-rejected',
      EXPIRED: 'badge-overdue',
    };
    return map[key] ?? 'badge-draft';
  });
}
