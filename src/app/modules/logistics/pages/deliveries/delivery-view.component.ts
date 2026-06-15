import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { DeliveryOrder } from '../../../../core/models/logistics.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';
import { WORKFLOW_STEPS } from '../../constants/logistics.constants';
import {
  canManageDeliveries,
  canMarkDelivered,
  canStartTrip,
} from '../../utils/logistics-permissions.util';

@Component({
  selector: 'app-delivery-view',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    LogisticsNavComponent,
    WorkflowStepperComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
    ModalComponent,
  ],
  templateUrl: './delivery-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly logistics = inject(LogisticsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  readonly delivery = signal<DeliveryOrder | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly showDeliverModal = signal(false);
  readonly savingDeliver = signal(false);
  readonly deliverySteps = WORKFLOW_STEPS.delivery;

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly canManage = () => canManageDeliveries(this.auth);
  readonly canStart = () => canStartTrip(this.auth);
  readonly canDeliver = () => canMarkDelivered(this.auth);

  readonly deliverForm = this.fb.group({
    signed_by: ['', Validators.required],
    customer_feedback: [''],
    condition_notes: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.logistics
      .getDeliveryOrder(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => this.delivery.set(d),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  workflowIndex(status: string): number {
    const map: Record<string, number> = {
      SCHEDULED: 0,
      IN_TRANSIT: 1,
      DELIVERED: 2,
      FAILED: 1,
      CANCELLED: 0,
    };
    return map[status] ?? 0;
  }

  startTrip(): void {
    const d = this.delivery();
    if (!d) return;
    this.confirm
      .open({
        title: 'Start Trip',
        message: `Depart with ${d.do_number}?`,
        confirmLabel: 'Start Trip',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.logistics.startTrip(d.id).subscribe({
          next: () => {
            this.notification.success('Trip started');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  openDeliverModal(): void {
    this.deliverForm.reset({ signed_by: '', customer_feedback: '', condition_notes: '' });
    this.showDeliverModal.set(true);
  }

  submitDelivered(): void {
    const d = this.delivery();
    if (!d || this.deliverForm.invalid) {
      this.notification.error('Signed by is required.');
      return;
    }
    const raw = this.deliverForm.getRawValue();
    this.savingDeliver.set(true);
    this.logistics
      .markDelivered(d.id, {
        signed_by: raw.signed_by!,
        customer_feedback: raw.customer_feedback ?? '',
        condition_notes: raw.condition_notes ?? '',
      })
      .pipe(finalize(() => this.savingDeliver.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Delivery completed — delivery note created');
          this.showDeliverModal.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  markFailed(): void {
    const reason = prompt('Failure reason:');
    if (!reason?.trim()) return;
    const d = this.delivery()!;
    this.logistics.markFailed(d.id, reason).subscribe({
      next: () => {
        this.notification.success('Delivery marked as failed');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  reviewDelivery(approved: boolean, reason = ''): void {
    const d = this.delivery();
    if (!d) return;
    this.logistics.reviewDelivery(d.id, approved, reason).subscribe({
      next: () => {
        this.notification.success(approved ? 'Delivery approved' : 'Delivery exception recorded');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  cancelDelivery(): void {
    const d = this.delivery();
    if (!d) return;
    this.confirm
      .open({
        title: 'Cancel Delivery',
        message: `Cancel ${d.do_number}?`,
        confirmLabel: 'Cancel Delivery',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.logistics.cancelDeliveryOrder(d.id).subscribe({
          next: () => {
            this.notification.success('Delivery cancelled');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }
}
