import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PurchaseOrder } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { exportPurchaseOrderPdf, printDocument } from '../../../../core/utils/procurement-pdf.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';
import { WORKFLOW_STEPS } from '../../constants/procurement.constants';
import { canApprovePO, canManagePO } from '../../utils/procurement-permissions.util';

@Component({
  selector: 'app-po-view',
  imports: [
    RouterLink,
    PageHeaderComponent,
    ProcurementNavComponent,
    WorkflowStepperComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './po-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly procurement = inject(ProcurementService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly po = signal<PurchaseOrder | null>(null);
  readonly poSteps = WORKFLOW_STEPS.po;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly canApprove = () => canApprovePO(this.auth);
  readonly canManage = () => canManagePO(this.auth);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.procurement.getPurchaseOrder(id).subscribe({
      next: (p) => this.po.set(p),
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  workflowIndex(status: string): number {
    const map: Record<string, number> = {
      DRAFT: 0, PENDING: 1, APPROVED: 2, SENT: 3, PARTIAL: 4, RECEIVED: 4,
    };
    return map[status] ?? 0;
  }

  approve(): void {
    const p = this.po();
    if (!p) return;
    this.procurement.approvePurchaseOrder(p.id).subscribe({
      next: () => { this.notification.success('PO approved'); this.load(); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  reject(): void {
    const reason = prompt('Rejection reason:');
    if (!reason?.trim()) return;
    const p = this.po()!;
    this.procurement.rejectPurchaseOrder(p.id, reason).subscribe({
      next: () => { this.notification.success('PO rejected'); this.load(); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  send(): void {
    const p = this.po()!;
    this.procurement.sendPurchaseOrder(p.id).subscribe({
      next: () => { this.notification.success('PO sent to supplier'); this.load(); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  printPo(): void {
    printDocument('po-print-area');
  }

  exportPdf(): void {
    const p = this.po();
    if (p) exportPurchaseOrderPdf(p);
  }
}
