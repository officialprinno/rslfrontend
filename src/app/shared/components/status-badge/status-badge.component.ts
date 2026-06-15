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
      PENDING: 'badge-pending',
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
      LOW_STOCK: 'badge-low_stock',
      OUT_STOCK: 'badge-out_stock',
      OPEN: 'badge-approved',
      CLOSED: 'badge-draft',
      SENT: 'badge-in_transit',
      RECEIVED: 'badge-completed',
      SELECTED: 'badge-approved',
      POSTED: 'badge-confirmed',
      PROCESSING: 'badge-pending',
      FAILED: 'badge-rejected',
      EXPIRED: 'badge-overdue',
    };
    return map[key] ?? 'badge-draft';
  });
}
