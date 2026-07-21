import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PaymentTerms } from '../../../../core/models/procurement.model';

@Component({
  selector: 'app-payment-terms-badge',
  template: `<span class="badge badge-blue">{{ label() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentTermsBadgeComponent {
  readonly terms = input.required<PaymentTerms>();

  label(): string {
    const term = this.terms() as string;
    if (!term) {
      return 'Not set';
    }
    if (term === 'CASH') return 'Cash';
    if (term === 'IMMEDIATE') return 'Immediate';
    const net = /^NET_(\d+)$/.exec(term);
    if (net) return `Net ${net[1]}`;
    return term;
  }
}
