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
  selector: 'app-inv-so-handover-panel',
  imports: [FormsModule, StatusBadgeComponent, InvSoWorkflowPrintComponent],
  templateUrl: './inv-so-handover-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvSoHandoverPanelComponent {
  private readonly inventory = inject(InventoryService);
  private readonly notification = inject(NotificationService);

  readonly order = input.required<InventorySalesOrderDetail>();
  readonly refreshed = output<void>();

  readonly saving = signal(false);
  handoverNotes = '';

  readonly formatDateTime = formatDateTime;

  confirmHandover(): void {
    const detail = this.order();
    const assignment = detail.dispatch_assignment;
    if (!assignment?.driver_name && detail.delivery_method === 'COMPANY') {
      this.notification.error('No driver assigned — logistics must assign a driver first.');
      return;
    }

    this.saving.set(true);
    this.inventory.confirmSalesOrderHandover(detail.id, this.handoverNotes.trim()).subscribe({
      next: () => {
        this.saving.set(false);
        const msg =
          detail.delivery_method === 'THIRD_PARTY'
            ? 'Handover confirmed — carrier may proceed to customer.'
            : 'Handover confirmed — driver may start delivery.';
        this.notification.success(msg);
        this.handoverNotes = '';
        this.refreshed.emit();
      },
      error: (e) => {
        this.saving.set(false);
        this.notification.error(getApiErrorMessage(e));
      },
    });
  }
}
