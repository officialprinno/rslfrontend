import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Warehouse } from '../../../../core/models/inventory.model';
import { WorkOrder } from '../../../../core/models/production.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductionService } from '../../../../core/services/production.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportWorkOrderPdf } from '../../../../core/utils/production-pdf.util';
import { formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProductionNavComponent } from '../../components/production-nav/production-nav.component';
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';
import {
  EXECUTION_ACTION_LABELS,
  MATERIAL_STATUS_COLOR,
  SHIFTS,
  WORKFLOW_STEPS,
} from '../../constants/production.constants';
import {
  canApproveProductionCompletion,
  canApproveWO,
  canAssignOperator,
  canCreateWorkOrder,
  canOperateWorkOrder,
  canReceiveFinishedGoods,
  canStartProduction,
} from '../../utils/production-permissions.util';

type WoTab = 'details' | 'output' | 'materials' | 'usage' | 'timeline';

@Component({
  selector: 'app-wo-view',
  imports: [
    RouterLink,
    FormsModule,
    PageHeaderComponent,
    ProductionNavComponent,
    WorkflowStepperComponent,
    StatusBadgeComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
    ModalComponent,
  ],
  templateUrl: './wo-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WoViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly production = inject(ProductionService);
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly workOrder = signal<WorkOrder | null>(null);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly activeTab = signal<WoTab>('details');
  readonly showStartModal = signal(false);
  readonly showCompleteModal = signal(false);
  readonly showPauseModal = signal(false);
  readonly showProgressModal = signal(false);
  readonly showSubmitModal = signal(false);
  readonly showStoreReceiptModal = signal(false);
  readonly actionLoading = signal(false);

  readonly pauseReason = signal('');
  readonly progressQty = signal(0);
  readonly progressDefects = signal(0);
  readonly progressNotes = signal('');
  readonly submitQty = signal(0);
  readonly submitDefects = signal(0);
  readonly submitNotes = signal('');
  readonly receiptWarehouse = signal<number | null>(null);
  readonly receiptQty = signal(0);
  readonly receiptNotes = signal('');

  readonly woSteps = WORKFLOW_STEPS.workOrder;
  readonly executionSteps = WORKFLOW_STEPS.execution;
  readonly executionActionLabels = EXECUTION_ACTION_LABELS;
  readonly shifts = SHIFTS;
  readonly materialStatusColor = MATERIAL_STATUS_COLOR;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly canManage = () => canCreateWorkOrder(this.auth);
  readonly canApprove = () => canApproveWO(this.auth);
  readonly canAssign = () => canAssignOperator(this.auth);
  readonly canOperate = () => canOperateWorkOrder(this.auth);
  readonly canStart = () => canStartProduction(this.auth);
  readonly canApproveProduction = () => canApproveProductionCompletion(this.auth);
  readonly canStoreReceipt = () => canReceiveFinishedGoods(this.auth);

  readonly tabs: { id: WoTab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'output', label: 'Output' },
    { id: 'materials', label: 'Materials' },
    { id: 'usage', label: 'Machine Usage' },
  ];

  ngOnInit(): void {
    this.inventory.getWarehouses({ page_size: 50 }).subscribe({
      next: (wh) => this.warehouses.set(wh),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.production
      .getWorkOrder(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (wo) => {
          this.workOrder.set(wo);
          this.progressQty.set(wo.quantity_produced);
          this.progressDefects.set(wo.quantity_rejected);
          this.submitQty.set(wo.quantity_produced);
          this.submitDefects.set(wo.quantity_rejected);
          this.receiptQty.set(wo.quantity_produced);
        },
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  stepsFor(wo: WorkOrder): string[] {
    return wo.execution_workflow ? this.executionSteps : this.woSteps;
  }

  setTab(tab: WoTab): void {
    this.activeTab.set(tab);
  }

  workflowIndex(status: string, execution: boolean): number {
    if (execution) {
      const map: Record<string, number> = {
        DRAFT: 0,
        APPROVED: 0,
        ASSIGNED: 1,
        IN_PROGRESS: 2,
        PAUSED: 2,
        COMPLETED_PENDING: 3,
        PROD_APPROVED: 4,
        WAITING_STORE: 4,
        INV_RECEIVED: 5,
        CLOSED: 5,
        CANCELLED: 0,
      };
      return map[status] ?? 0;
    }
    const map: Record<string, number> = {
      DRAFT: 0,
      APPROVED: 1,
      IN_PROGRESS: 2,
      COMPLETED: 3,
      CANCELLED: 0,
    };
    return map[status] ?? 0;
  }

  shiftLabel(shift: string): string {
    return SHIFTS.find((s) => s.value === shift)?.label ?? shift;
  }

  exportPdf(): void {
    const wo = this.workOrder();
    if (wo) exportWorkOrderPdf(wo);
  }

  submitWo(): void {
    const wo = this.workOrder();
    if (!wo) return;
    this.confirm
      .open({ title: 'Submit Work Order', message: `Submit ${wo.wo_number}?`, confirmLabel: 'Submit' })
      .subscribe((ok) => {
        if (!ok) return;
        this.production.submitWorkOrder(wo.id).subscribe({
          next: () => {
            this.notification.success('Work order submitted');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  approveWo(): void {
    const wo = this.workOrder();
    if (!wo) return;
    this.confirm
      .open({ title: 'Approve Work Order', message: `Approve ${wo.wo_number}?`, confirmLabel: 'Approve' })
      .subscribe((ok) => {
        if (!ok) return;
        this.production.approveWorkOrder(wo.id).subscribe({
          next: () => {
            this.notification.success('Work order approved');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  assignOperator(): void {
    const wo = this.workOrder();
    if (!wo) return;
    this.actionLoading.set(true);
    this.production
      .assignOperator(wo.id, wo.operator_id)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Operator assigned');
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  operatorStart(): void {
    const wo = this.workOrder();
    if (!wo) return;
    this.actionLoading.set(true);
    this.production
      .operatorStart(wo.id, wo.machine ?? undefined)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Production started');
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  confirmPause(): void {
    const wo = this.workOrder();
    if (!wo || !this.pauseReason().trim()) return;
    this.actionLoading.set(true);
    this.production
      .pauseWorkOrder(wo.id, this.pauseReason())
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Production paused');
          this.showPauseModal.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  resumeProduction(): void {
    const wo = this.workOrder();
    if (!wo) return;
    this.production.resumeWorkOrder(wo.id).subscribe({
      next: () => {
        this.notification.success('Production resumed');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  confirmProgress(): void {
    const wo = this.workOrder();
    if (!wo) return;
    this.actionLoading.set(true);
    this.production
      .recordProgress(wo.id, {
        quantity_produced: this.progressQty(),
        quantity_defective: this.progressDefects(),
        machine_notes: this.progressNotes(),
      })
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Progress recorded');
          this.showProgressModal.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  recordBomConsumption(): void {
    const wo = this.workOrder();
    if (!wo?.material_requirements?.length) return;
    const lines = wo.material_requirements.map((m) => ({
      item_id: m.item_id,
      quantity_consumed: +m.required_quantity,
      waste_quantity: 0,
    }));
    this.production.recordConsumption(wo.id, lines).subscribe({
      next: () => {
        this.notification.success('Material consumption recorded (pending approval)');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  confirmSubmitCompletion(): void {
    const wo = this.workOrder();
    if (!wo) return;
    this.actionLoading.set(true);
    this.production
      .submitCompletion(wo.id, {
        quantity_produced: this.submitQty(),
        quantity_defective: this.submitDefects(),
        completion_notes: this.submitNotes(),
      })
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Completion submitted for approval');
          this.showSubmitModal.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  approveProduction(): void {
    const wo = this.workOrder();
    if (!wo) return;
    this.confirm
      .open({
        title: 'Approve Production',
        message: `Approve output and materials for ${wo.wo_number}?`,
        confirmLabel: 'Approve',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.production.approveProduction(wo.id).subscribe({
          next: () => {
            this.notification.success('Production approved — awaiting store receipt');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  confirmStoreReceipt(): void {
    const wo = this.workOrder();
    const wh = this.receiptWarehouse();
    if (!wo || !wh) return;
    this.actionLoading.set(true);
    this.production
      .storeReceipt(wo.id, {
        warehouse: wh,
        quantity_received: this.receiptQty(),
        notes: this.receiptNotes(),
      })
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Finished goods received into inventory');
          this.showStoreReceiptModal.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openStartModal(): void {
    this.showStartModal.set(true);
  }

  confirmStartProduction(): void {
    const wo = this.workOrder();
    if (!wo) return;
    this.actionLoading.set(true);
    this.production
      .startProduction(wo.id)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Production started — materials issued');
          this.showStartModal.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openCompleteModal(): void {
    this.showCompleteModal.set(true);
  }

  confirmComplete(): void {
    const wo = this.workOrder();
    if (!wo) return;
    this.actionLoading.set(true);
    this.production
      .completeWorkOrder(wo.id)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Work order completed');
          this.showCompleteModal.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  cancelWo(): void {
    const wo = this.workOrder();
    if (!wo) return;
    this.confirm
      .open({
        title: 'Cancel Work Order',
        message: `Cancel ${wo.wo_number}?`,
        confirmLabel: 'Cancel WO',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.production.cancelWorkOrder(wo.id).subscribe({
          next: () => {
            this.notification.success('Work order cancelled');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }
}
