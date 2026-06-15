import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Invoice, SalesOrder } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { SoWorkflowPanelComponent } from '../../components/so-workflow-panel/so-workflow-panel.component';
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';
import { WORKFLOW_STEPS } from '../../constants/sales.constants';
import { canApproveSO, canCreateQuotation } from '../../utils/sales-permissions.util';

type SoTab = 'details' | 'deliveries' | 'invoices' | 'activity';

@Component({
  selector: 'app-so-view',
  imports: [
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    WorkflowStepperComponent,
    SoWorkflowPanelComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
  ],
  templateUrl: './so-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sales = inject(SalesService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly order = signal<SalesOrder | null>(null);
  readonly invoices = signal<Invoice[]>([]);
  readonly loading = signal(true);
  readonly loadingInvoices = signal(false);
  readonly error = signal(false);
  readonly activeTab = signal<SoTab>('details');
  readonly orderSteps = WORKFLOW_STEPS.order;

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly canManage = () => canCreateQuotation(this.auth);
  readonly canConfirm = () => canApproveSO(this.auth);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.sales
      .getSalesOrder(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (o) => this.order.set(o),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  setTab(tab: SoTab): void {
    this.activeTab.set(tab);
    if (tab === 'invoices' && !this.invoices().length) {
      this.loadInvoices();
    }
  }

  loadInvoices(): void {
    const o = this.order();
    if (!o) return;
    this.loadingInvoices.set(true);
    this.sales
      .getInvoices({ sales_order: o.id, page_size: 50 })
      .pipe(finalize(() => this.loadingInvoices.set(false)))
      .subscribe({
        next: (d) => this.invoices.set(d.results),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  workflowIndex(status: string): number {
    const map: Record<string, number> = {
      NEW_ORDER: 0,
      DRAFT: 0,
      STOCK_VERIFICATION: 1,
      OUT_OF_STOCK: 1,
      PENDING_DELIVERY_COST: 1,
      DELIVERY_COST_CALC: 1,
      QUOTATION_PREP: 2,
      QUOTATION_SENT: 2,
      WAITING_CUSTOMER: 2,
      QUOTATION_ACCEPTED: 2,
      INVOICE_GENERATED: 3,
      AWAITING_PAYMENT: 3,
      PAYMENT_CONFIRMED: 4,
      READY_FOR_PICKUP: 4,
      READY_FOR_DELIVERY: 4,
      VEHICLE_ASSIGNED: 4,
      THIRD_PARTY_ASSIGNED: 4,
      DISPATCHED: 5,
      IN_TRANSIT: 5,
      DELIVERED: 6,
      DELIVERY_CONFIRMED: 6,
      COMPLETED_PICKUP: 7,
      COMPLETED_COMPANY: 7,
      COMPLETED_THIRD_PARTY: 7,
      CONFIRMED: 4,
      PROCESSING: 5,
      PARTIAL: 5,
    };
    return map[status] ?? 0;
  }

  isActiveDelivery(status: string): boolean {
    return [
      'VEHICLE_ASSIGNED',
      'THIRD_PARTY_ASSIGNED',
      'DISPATCHED',
      'IN_TRANSIT',
      'DELIVERED',
      'DELIVERY_CONFIRMED',
    ].includes(status);
  }

  deliveryDestination(o: SalesOrder): string {
    return o.requested_delivery_location || o.delivery_address || '—';
  }

  isQuotationStage(status: string): boolean {
    return [
      'QUOTATION_PREP',
      'QUOTATION_SENT',
      'WAITING_CUSTOMER',
      'QUOTATION_ACCEPTED',
    ].includes(status);
  }

  orderGrandTotal(o: SalesOrder): number {
    return Number(o.total_amount ?? 0) + Number(o.delivery_cost ?? 0);
  }

  cancelOrder(): void {
    const reason = prompt('Cancellation reason:');
    if (!reason?.trim()) return;
    const o = this.order()!;
    this.sales.cancelSalesOrder(o.id, reason).subscribe({
      next: () => {
        this.notification.success('Sales order cancelled');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
