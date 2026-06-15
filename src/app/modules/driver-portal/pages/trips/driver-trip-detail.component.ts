import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { DriverTrip } from '../../../../core/models/driver-portal.model';
import { DriverPortalService } from '../../../../core/services/driver-portal.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDateTime } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { DriverPortalNavComponent } from '../../components/driver-portal-nav/driver-portal-nav.component';
import { TRIP_STATUS_INDEX, TRIP_WORKFLOW_STEPS, VEHICLE_CONDITIONS } from '../../constants/driver-portal.constants';
import { WorkflowStepperComponent } from '../../../procurement/components/workflow-stepper/workflow-stepper.component';

@Component({
  selector: 'app-driver-trip-detail',
  imports: [
    RouterLink,
    FormsModule,
    PageHeaderComponent,
    DriverPortalNavComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
    ModalComponent,
    WorkflowStepperComponent,
  ],
  templateUrl: './driver-trip-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverTripDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly portal = inject(DriverPortalService);
  private readonly notification = inject(NotificationService);

  readonly trip = signal<DriverTrip | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal(false);
  readonly tripSteps = TRIP_WORKFLOW_STEPS;
  readonly conditions = VEHICLE_CONDITIONS;

  readonly showStart = signal(false);
  readonly showArrive = signal(false);
  readonly showDeliver = signal(false);
  readonly showReturn = signal(false);
  readonly showConfirmReturn = signal(false);

  odometerStart = 0;
  odometerEnd = 0;
  fuelRemaining: number | null = null;
  vehicleCondition = 'GOOD';
  arrivalNotes = '';
  receiverName = '';
  receiverPosition = '';
  receiverPhone = '';
  receiverCompany = '';
  quantityDelivered = 0;
  deliveryNotes = '';

  readonly formatDateTime = formatDateTime;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.loading.set(true);
    this.error.set(false);
    this.portal
      .getTrip(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (t) => {
          this.trip.set(t);
          const totalQty = t.items.reduce((s, i) => s + Number(i.quantity), 0);
          this.quantityDelivered = totalQty;
        },
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  workflowIndex(status: string): number {
    return TRIP_STATUS_INDEX[status] ?? 0;
  }

  private runAction(fn: () => ReturnType<DriverPortalService['startTrip']>, success: string): void {
    this.saving.set(true);
    fn()
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success(success);
          this.closeModals();
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  closeModals(): void {
    this.showStart.set(false);
    this.showArrive.set(false);
    this.showDeliver.set(false);
    this.showReturn.set(false);
    this.showConfirmReturn.set(false);
  }

  submitStart(): void {
    const t = this.trip()!;
    this.runAction(
      () =>
        this.portal.startTrip(t.id, {
          odometer_start: this.odometerStart,
          vehicle_condition: this.vehicleCondition,
        }),
      'Delivery started',
    );
  }

  submitArrive(): void {
    const t = this.trip()!;
    this.runAction(() => this.portal.confirmArrival(t.id, this.arrivalNotes), 'Arrival confirmed');
  }

  submitDelivery(): void {
    const t = this.trip()!;
    if (!this.receiverName.trim()) {
      this.notification.error('Receiver name is required.');
      return;
    }
    this.runAction(
      () =>
        this.portal.confirmDelivery(t.id, {
          receiver_name: this.receiverName,
          receiver_position: this.receiverPosition,
          receiver_phone: this.receiverPhone,
          receiver_company: this.receiverCompany,
          quantity_delivered: this.quantityDelivered,
          delivery_notes: this.deliveryNotes,
        }),
      'Delivery confirmed — logistics notified',
    );
  }

  submitStartReturn(): void {
    const t = this.trip()!;
    this.runAction(
      () => this.portal.startReturn(t.id, this.vehicleCondition),
      'Return trip started',
    );
  }

  submitConfirmReturn(): void {
    const t = this.trip()!;
    this.runAction(
      () =>
        this.portal.confirmReturn(t.id, {
          odometer_end: this.odometerEnd,
          fuel_remaining: this.fuelRemaining ?? undefined,
          vehicle_condition: this.vehicleCondition,
        }),
      'Return confirmed — you are now available',
    );
  }
}
