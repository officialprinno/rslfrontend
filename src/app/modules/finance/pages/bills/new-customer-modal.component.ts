import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { FinanceCustomer, FinanceCustomerFormData } from '../../../../core/models/finance.model';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-new-customer-modal',
  imports: [FormsModule, ModalComponent],
  templateUrl: './new-customer-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewCustomerModalComponent {
  private readonly finance = inject(FinanceService);
  private readonly notification = inject(NotificationService);

  readonly open = input(false);
  readonly created = output<{ customer: FinanceCustomer; reused: boolean }>();
  readonly closed = output<void>();

  readonly saving = signal(false);

  form: FinanceCustomerFormData = {
    name: '',
    email: '',
    phone: '',
    tin_number: '',
    address: '',
  };

  reset(): void {
    this.form = { name: '', email: '', phone: '', tin_number: '', address: '' };
  }

  submit(): void {
    if (!this.form.name.trim()) {
      this.notification.error('Display name is required.');
      return;
    }
    this.saving.set(true);
    this.finance
      .createCustomer(this.form)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: ({ data, message }) => {
          const reused = message.toLowerCase().includes('already exists');
          this.notification.success(message);
          this.created.emit({ customer: data, reused });
          this.reset();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
