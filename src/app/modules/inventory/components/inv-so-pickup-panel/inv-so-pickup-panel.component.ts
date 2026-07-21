import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InventorySalesOrderDetail } from '../../../../core/models/inventory.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDateTime } from '../../../../core/utils/format.util';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { InvSoWorkflowPrintComponent } from '../inv-so-workflow-print/inv-so-workflow-print.component';

@Component({
  selector: 'app-inv-so-pickup-panel',
  imports: [FormsModule, StatusBadgeComponent, InvSoWorkflowPrintComponent],
  templateUrl: './inv-so-pickup-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvSoPickupPanelComponent {
  private readonly inventory = inject(InventoryService);
  private readonly notification = inject(NotificationService);

  readonly order = input.required<InventorySalesOrderDetail>();
  readonly refreshed = output<void>();

  readonly saving = signal(false);
  prepareNotes = '';
  pickupForm = {
    pickup_date: new Date().toISOString().slice(0, 10),
    receiver_name: '',
    receiver_phone: '',
    notes: '',
  };

  readonly formatDateTime = formatDateTime;

  markReady(): void {
    this.saving.set(true);
    this.inventory.prepareSalesOrderPickup(this.order().id, this.prepareNotes.trim()).subscribe({
      next: () => {
        this.saving.set(false);
        this.notification.success('Order marked ready — customer may collect at gate.');
        this.prepareNotes = '';
        this.refreshed.emit();
      },
      error: (e) => {
        this.saving.set(false);
        this.notification.error(getApiErrorMessage(e));
      },
    });
  }

  confirmCollection(): void {
    const { pickup_date, receiver_name, receiver_phone } = this.pickupForm;
    if (!receiver_name.trim() || !receiver_phone.trim()) {
      this.notification.error('Enter receiver name and phone.');
      return;
    }
    this.saving.set(true);
    this.inventory
      .confirmCustomerPickup(this.order().id, {
        pickup_date,
        receiver_name: receiver_name.trim(),
        receiver_phone: receiver_phone.trim(),
        notes: this.pickupForm.notes.trim(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notification.success('Customer pickup completed — stock released.');
          this.refreshed.emit();
        },
        error: (e) => {
          this.saving.set(false);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }
}
