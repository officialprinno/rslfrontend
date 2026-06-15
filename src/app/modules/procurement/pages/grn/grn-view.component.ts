import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { GoodsReceivedNote } from '../../../../core/models/procurement.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { exportGrnPdf, printDocument } from '../../../../core/utils/procurement-pdf.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';
import { WORKFLOW_STEPS } from '../../constants/procurement.constants';

@Component({
  selector: 'app-grn-view',
  imports: [
    RouterLink,
    PageHeaderComponent,
    ProcurementNavComponent,
    WorkflowStepperComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './grn-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrnViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly procurement = inject(ProcurementService);
  private readonly notification = inject(NotificationService);

  readonly grn = signal<GoodsReceivedNote | null>(null);
  readonly grnSteps = WORKFLOW_STEPS.grn;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.procurement.getGRN(id).subscribe({
      next: (g) => this.grn.set(g),
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  workflowIndex(status: string): number {
    const map: Record<string, number> = { DRAFT: 0, CONFIRMED: 1, POSTED: 2 };
    return map[status] ?? 0;
  }

  exportPdf(): void {
    const g = this.grn();
    if (g) exportGrnPdf(g);
  }

  printGrn(): void {
    printDocument('grn-print-area');
  }
}
