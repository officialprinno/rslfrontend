import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { DeliveryOrder } from '../../../../core/models/logistics.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { LogisticsService } from '../../../../core/services/logistics.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PromptDialogService } from '../../../../core/services/prompt-dialog.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { downloadBlob } from '../../../../core/utils/download.util';
import { formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { LogisticsNavComponent } from '../../components/logistics-nav/logistics-nav.component';
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';
import { WORKFLOW_STEPS } from '../../constants/logistics.constants';
import { TRANSPORT_METHODS } from '../../../sales/constants/sales.constants';
import {
  canManageDeliveries,
  canMarkDelivered,
  canStartTrip,
} from '../../utils/logistics-permissions.util';

@Component({
  selector: 'app-delivery-view',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    FormsModule,
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
  private readonly promptDialog = inject(PromptDialogService);
  private readonly fb = inject(FormBuilder);

  readonly delivery = signal<DeliveryOrder | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly showDeliverModal = signal(false);
  readonly savingDeliver = signal(false);
  readonly savingInternalCost = signal(false);
  readonly downloadingDn = signal(false);
  readonly deliverySteps = WORKFLOW_STEPS.delivery;
  readonly transportMethods = TRANSPORT_METHODS;

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly canManage = () => canManageDeliveries(this.auth);
  readonly canStart = () => canStartTrip(this.auth);
  readonly canDeliver = () => canMarkDelivered(this.auth);

  isImageProof(url: string | undefined | null): boolean {
    if (!url) return false;
    return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
  }

  proofDocumentName(url: string | undefined | null): string {
    if (!url) return 'Attached document';
    const segment = url.split('/').pop() ?? '';
    try {
      return decodeURIComponent(segment.split('?')[0]) || 'Attached document';
    } catch {
      return segment || 'Attached document';
    }
  }

  readonly deliverForm = this.fb.group({
    signed_by: ['', Validators.required],
    customer_feedback: [''],
    condition_notes: [''],
  });

  internalCostForm = {
    delivery_distance_km: 0,
    transport_method: 'ROAD',
    fuel_cost: 0,
    loading_cost: 0,
    offloading_cost: 0,
    additional_charges: 0,
    notes: '',
  };

  internalCostTotal(): number {
    return (
      Number(this.internalCostForm.fuel_cost ?? 0) +
      Number(this.internalCostForm.loading_cost ?? 0) +
      Number(this.internalCostForm.offloading_cost ?? 0) +
      Number(this.internalCostForm.additional_charges ?? 0)
    );
  }

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
        next: (d) => {
          this.delivery.set(d);
          this.internalCostForm = {
            delivery_distance_km: Number(d.distance_km ?? 0),
            transport_method: d.transport_method ?? 'ROAD',
            fuel_cost: Number(d.fuel_cost ?? 0),
            loading_cost: Number(d.loading_cost ?? 0),
            offloading_cost: Number(d.offloading_cost ?? 0),
            additional_charges: Number(d.additional_charges ?? 0),
            notes: d.notes ?? '',
          };
        },
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  downloadDeliveryNote(): void {
    const d = this.delivery();
    if (!d?.delivery_note_id) return;
    this.downloadingDn.set(true);
    this.logistics
      .downloadDeliveryNotePdf(d.delivery_note_id)
      .pipe(finalize(() => this.downloadingDn.set(false)))
      .subscribe({
        next: (blob) => downloadBlob(blob, `${d.delivery_note_number || 'delivery-note'}.pdf`),
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to generate PDF')),
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
    const d = this.delivery();
    if (!d) return;
    this.promptDialog.open({
      title: 'Mark Delivery as Failed',
      message: `Provide the reason ${d.do_number} could not be completed.`,
      label: 'Failure reason',
      placeholder: 'Explain what prevented the delivery',
      required: true,
      multiline: true,
      confirmLabel: 'Mark as Failed',
    }).subscribe((reason) => {
      if (!reason?.trim()) return;
      this.logistics.markFailed(d.id, reason.trim()).subscribe({
        next: () => {
          this.notification.success('Delivery marked as failed');
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
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

  saveInternalCost(): void {
    const d = this.delivery();
    if (!d) return;
    this.savingInternalCost.set(true);
    this.logistics
      .recordInternalDeliveryCost(d.id, this.internalCostForm)
      .pipe(finalize(() => this.savingInternalCost.set(false)))
      .subscribe({
        next: (updated) => {
          this.notification.success('Internal delivery cost saved');
          this.delivery.set(updated);
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
