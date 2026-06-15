import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PaymentTerms } from '../../../../core/models/procurement.model';

@Component({
  selector: 'app-payment-terms-badge',
  template: `<span class="badge bg-indigo-50 text-indigo-700">{{ label() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentTermsBadgeComponent {
  readonly terms = input.required<PaymentTerms>();

  label(): string {
    const map: Record<PaymentTerms, string> = {
      IMMEDIATE: 'Immediate',
      NET_15: 'Net 15',
      NET_30: 'Net 30',
      NET_60: 'Net 60',
    };
    return map[this.terms()] ?? this.terms();
  }
}
