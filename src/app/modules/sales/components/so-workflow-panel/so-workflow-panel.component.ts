import { DecimalPipe } from '@angular/common';

import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';

import { FormsModule } from '@angular/forms';



import { SalesOrder } from '../../../../core/models/sales.model';

import { NotificationService } from '../../../../core/services/notification.service';

import { SalesService } from '../../../../core/services/sales.service';

import { getApiErrorMessage } from '../../../../core/utils/api.util';

import { PAYMENT_METHODS } from '../../constants/sales.constants';



const LOGISTICS_HANDLED_STATUSES: SalesOrder['status'][] = [

  'PAYMENT_CONFIRMED',

  'READY_FOR_PICKUP',

  'READY_FOR_DELIVERY',

  'VEHICLE_ASSIGNED',

  'THIRD_PARTY_ASSIGNED',

  'DISPATCHED',

  'IN_TRANSIT',

  'DELIVERED',

];



@Component({

  selector: 'app-so-workflow-panel',

  imports: [DecimalPipe, FormsModule],

  templateUrl: './so-workflow-panel.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class SoWorkflowPanelComponent {

  private readonly sales = inject(SalesService);

  private readonly notification = inject(NotificationService);



  readonly order = input.required<SalesOrder>();

  readonly refreshed = output<void>();



  readonly paymentMethods = PAYMENT_METHODS;



  paymentProof = {

    amount: 0,

    payment_method: 'BANK_TRANSFER',

    reference_number: '',

    proof_notes: '',

  };



  constructor() {

    effect(() => {

      const order = this.order();

      if (order.status === 'AWAITING_PAYMENT') {

        this.paymentProof.amount = this.dueAmount(order);

      }

    });

  }



  isLogisticsHandledStatus(status: SalesOrder['status']): boolean {
    return LOGISTICS_HANDLED_STATUSES.includes(status);
  }



  dueAmount(order = this.order()): number {

    return Number(order.total_amount ?? 0) + Number(order.delivery_cost ?? 0);

  }



  pendingPaymentProof(order = this.order()) {

    return order.payment_proofs?.find((p) => p.status === 'PENDING') ?? null;

  }



  private refresh(): void {

    this.refreshed.emit();

  }



  submit(): void {

    this.run(() => this.sales.submitSalesOrder(this.order().id), 'Order submitted');

  }



  verifyStock(partial = false): void {

    this.run(

      () => this.sales.verifyOrderStock(this.order().id, partial),

      partial ? 'Partial stock reserved' : 'Stock verified',

    );

  }



  createPr(): void {

    this.run(

      () => this.sales.createOrderProcurement(this.order().id),

      'Procurement request created',

    );

  }



  sendToLogistics(): void {

    this.run(

      () => this.sales.sendToLogistics(this.order().id),

      'Order sent to Logistics for delivery cost',

    );

  }



  sendQuotation(): void {

    this.run(() => this.sales.sendOrderQuotation(this.order().id), 'Quotation sent');

  }



  acceptQuotation(): void {

    this.run(() => this.sales.acceptOrderQuotation(this.order().id), 'Quotation accepted');

  }



  rejectQuotation(): void {

    const reason = prompt('Rejection reason (optional):') ?? '';

    this.run(

      () => this.sales.rejectOrderQuotation(this.order().id, reason),

      'Quotation rejected',

    );

  }



  generateInvoice(): void {

    this.run(() => this.sales.generateOrderInvoice(this.order().id), 'Invoice generated');

  }



  submitPayment(): void {

    const reference = this.paymentProof.reference_number.trim();

    if (!reference) {

      this.notification.error('Payment reference number is required.');

      return;

    }

    const amount = Number(this.paymentProof.amount);

    if (!Number.isFinite(amount) || amount <= 0) {

      this.notification.error('Enter a valid payment amount greater than zero.');

      return;

    }

    this.run(

      () =>

        this.sales.submitOrderPayment(this.order().id, {

          amount,

          payment_method: this.paymentProof.payment_method,

          reference_number: reference,

          proof_notes: this.paymentProof.proof_notes?.trim() ?? '',

        }),

      'Payment proof submitted',

    );

  }



  verifyPayment(approved: boolean): void {

    const proof = this.pendingPaymentProof();

    if (!proof) {

      this.notification.error('Submit payment proof first, then verify.');

      return;

    }

    const reason = approved ? '' : (prompt('Failure reason:') ?? '');

    this.run(

      () =>

        this.sales.verifyOrderPayment(this.order().id, {

          proof_id: proof.id,

          approved,

          reason,

        }),

      approved ? 'Payment verified' : 'Payment rejected',

    );

  }



  closeOrder(): void {

    this.run(() => this.sales.closeSalesOrder(this.order().id), 'Order closed');

  }



  private run<T>(fn: () => import('rxjs').Observable<T>, successMsg: string): void {

    fn().subscribe({

      next: () => {

        this.notification.success(successMsg);

        this.refresh();

      },

      error: (e) => this.notification.error(getApiErrorMessage(e)),

    });

  }

}

