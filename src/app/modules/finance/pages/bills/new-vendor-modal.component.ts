import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Currency } from '../../../../core/models/inventory.model';
import { FinanceVendor, FinanceVendorFormData } from '../../../../core/models/finance.model';
import { CurrencyService } from '../../../../core/services/currency.service';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { BILL_PAYMENT_TERMS } from '../../constants/finance.constants';

@Component({
  selector: 'app-new-vendor-modal',
  imports: [FormsModule, ModalComponent],
  templateUrl: './new-vendor-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewVendorModalComponent {
  private readonly finance = inject(FinanceService);
  private readonly currencyService = inject(CurrencyService);
  private readonly notification = inject(NotificationService);

  readonly open = input(false);
  readonly created = output<{ vendor: FinanceVendor; reused: boolean }>();
  readonly closed = output<void>();

  readonly saving = signal(false);
  readonly currencies = signal<Currency[]>([]);
  readonly paymentTerms = BILL_PAYMENT_TERMS;

  form: FinanceVendorFormData = {
    name: '',
    registration_number: '',
    tin_number: '',
    email: '',
    phone: '',
    currency: 0,
    payment_terms: 'NET_30',
    country: 'Tanzania',
  };

  constructor() {
    this.currencyService.getCurrencies().subscribe((list) => {
      this.currencies.set(list);
      const tzs = list.find((c) => c.code === 'TZS');
      if (tzs) this.form.currency = tzs.id;
    });
  }

  reset(): void {
    this.form = {
      name: '',
      tin_number: '',
      email: '',
      phone: '',
      currency: this.currencies().find((c) => c.code === 'TZS')?.id ?? 0,
      payment_terms: 'NET_30',
      country: 'Tanzania',
    };
  }

  submit(): void {
    if (!this.form.name.trim()) {
      this.notification.error('Display name is required.');
      return;
    }
    this.saving.set(true);
    this.finance
      .createVendor(this.form)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: ({ data, message }) => {
          const reused = message.toLowerCase().includes('already exists');
          this.notification.success(message);
          this.created.emit({ vendor: data, reused });
          this.reset();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
