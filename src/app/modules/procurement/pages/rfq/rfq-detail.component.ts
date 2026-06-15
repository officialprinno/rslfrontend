import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { RFQ, SupplierQuotation } from '../../../../core/models/procurement.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';
import { WorkflowStepperComponent } from '../../components/workflow-stepper/workflow-stepper.component';
import { WORKFLOW_STEPS } from '../../constants/procurement.constants';

@Component({
  selector: 'app-rfq-detail',
  imports: [
    RouterLink,
    PageHeaderComponent,
    ProcurementNavComponent,
    WorkflowStepperComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './rfq-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RfqDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly procurement = inject(ProcurementService);
  private readonly notification = inject(NotificationService);

  readonly rfq = signal<RFQ | null>(null);
  readonly quotations = signal<SupplierQuotation[]>([]);
  readonly rfqSteps = WORKFLOW_STEPS.rfq;
  readonly formatDate = formatDate;
  readonly formatCurrency = formatCurrency;

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.procurement.getRFQ(id).subscribe({
      next: (r) => this.rfq.set(r),
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
    this.procurement.getQuotations({ rfq: id, page_size: 50 }).subscribe({
      next: (d) => this.quotations.set(d.results),
    });
  }

  workflowIndex(status: string): number {
    return status === 'OPEN' ? 0 : status === 'CLOSED' ? 2 : 1;
  }

  selectWinner(q: SupplierQuotation): void {
    this.procurement.selectQuotation(q.id).subscribe({
      next: () => this.notification.success('Winner selected — draft PO created'),
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  respondedQuotations(): SupplierQuotation[] {
    return this.quotations().filter((q) => q.total_amount > 0);
  }

  isLowestPrice(q: SupplierQuotation): boolean {
    const list = this.respondedQuotations();
    if (list.length < 2) return false;
    const min = Math.min(...list.map((x) => Number(x.total_amount)));
    return Number(q.total_amount) === min;
  }
}
