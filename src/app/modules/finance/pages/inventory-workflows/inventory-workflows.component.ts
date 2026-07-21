import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import {
  InventoryFinanceDashboard,
  InventoryFinanceWorkflow,
  InventoryFinanceWorkflowStatus,
} from '../../../../core/models/finance.model';
import { FinanceService } from '../../../../core/services/finance.service';
import { formatCurrency, formatDate, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { canApproveInventoryWorkflows, canProcessInventoryWorkflows } from '../../utils/finance-permissions.util';

const STATUS_OPTIONS: Array<{ value: 'ALL' | InventoryFinanceWorkflowStatus; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'COSTING_IN_PROGRESS', label: 'Costing In Progress' },
  { value: 'PRICING_IN_PROGRESS', label: 'Pricing In Progress' },
  { value: 'PENDING_FINANCE_APPROVAL', label: 'Pending Finance Approval' },
  { value: 'READY_FOR_SALE', label: 'Ready For Sale' },
];

const ORDER_OPTIONS = [
  { value: '-received_at', label: 'Newest received first' },
  { value: 'received_at', label: 'Oldest received first' },
  { value: '-approved_at', label: 'Recently approved first' },
  { value: 'item__code', label: 'Item code A-Z' },
] as const;

@Component({
  selector: 'app-inventory-workflows',
  imports: [
    FormsModule,
    RouterLink,
    FinanceNavComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    PaginationComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  template: `
    <app-page-header
      title="Finance Inventory Workflows"
      subtitle="Inventory stays in warehouse custody while Finance controls costing, pricing, and release for sale."
      [hasActions]="false"
    />

    <app-finance-nav />

    @if (error()) {
      <app-error-state
        title="Unable to load finance workflows"
        message="Check the company workspace and try again."
        (retry)="load()"
      />
    } @else {
      @if (dashboard(); as dash) {
        <section class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <article class="card p-5 border border-amber-100 bg-amber-50/60">
            <p class="text-xs uppercase tracking-[0.18em] text-amber-700">Received</p>
            <p class="text-3xl font-semibold text-gray-900 mt-2">{{ dash.pending_received }}</p>
            <p class="text-sm text-gray-600 mt-1">Awaiting finance costing ownership</p>
          </article>
          <article class="card p-5 border border-sky-100 bg-sky-50/70">
            <p class="text-xs uppercase tracking-[0.18em] text-sky-700">In Progress</p>
            <p class="text-3xl font-semibold text-gray-900 mt-2">{{ dash.costing_in_progress + dash.pending_finance_approval }}</p>
            <p class="text-sm text-gray-600 mt-1">Costing, pricing, or approval underway</p>
          </article>
          <article class="card p-5 border border-rose-100 bg-rose-50/70">
            <p class="text-xs uppercase tracking-[0.18em] text-rose-700">Finance Hold</p>
            <p class="text-3xl font-semibold text-gray-900 mt-2">{{ formatNumber(dash.total_finance_hold, 4) }}</p>
            <p class="text-sm text-gray-600 mt-1">Units blocked from sales pending approval</p>
          </article>
          <article class="card p-5 border border-emerald-100 bg-emerald-50/70">
            <p class="text-xs uppercase tracking-[0.18em] text-emerald-700">Inventory Value</p>
            <p class="text-2xl font-semibold text-gray-900 mt-2">{{ formatCurrency(dash.total_inventory_value) }}</p>
            <p class="text-sm text-gray-600 mt-1">Company inventory assets using unit cost only</p>
          </article>
        </section>
      }

      <section class="card p-5 mb-6 border border-gray-200">
        <div class="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div>
            <p class="text-sm font-semibold text-gray-900">Finance release queue</p>
            <p class="text-sm text-gray-500">Only Finance Manager can move inventory to READY_FOR_SALE.</p>
            @if (!canApproveWorkflows()) {
              <p class="text-xs text-amber-700 mt-2">You can review workflow progress, but final release is hidden unless your role can approve Finance inventory.</p>
            }
          </div>
          <div class="flex flex-col sm:flex-row gap-3 lg:w-auto w-full">
            <input
              [(ngModel)]="searchTerm"
              placeholder="Search item, GRN, or warehouse"
              class="input-field min-w-[16rem]"
              (keyup.enter)="applyFilters()"
            />
            <select [(ngModel)]="selectedStatus" class="input-field min-w-56">
              @for (option of statusOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
            <select [(ngModel)]="selectedOrdering" class="input-field min-w-56">
              @for (option of orderOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
            <button type="button" class="btn-primary whitespace-nowrap" (click)="applyFilters()">Apply</button>
            <button type="button" class="btn-secondary whitespace-nowrap" (click)="clearFilters()">Clear</button>
            <a routerLink="/finance/inventory-valuations" class="btn-ghost whitespace-nowrap">View valuation</a>
          </div>
        </div>
      </section>

      <section class="card p-0 overflow-hidden">
        @if (loading()) {
          <div class="p-5">
            <app-table-skeleton [rows]="6" [cols]="8" />
          </div>
        } @else if (!workflows().length) {
          <app-empty-state
            [title]="hasActiveFilters() ? 'No workflows match these filters' : 'No finance workflows found'"
            [message]="hasActiveFilters() ? 'Try clearing the search, status, or sort filters for this company workspace.' : 'Received stock for this company will appear here once GRNs are confirmed.'"
            [showSwitchCompany]="!hasActiveFilters()"
            moduleName="Finance Inventory Workflows"
            (companySwitched)="load()"
          />
        } @else {
          <div class="overflow-x-auto">
            <table class="enterprise-table w-full">
              <thead>
                <tr>
                  <th class="table-th">GRN</th>
                  <th class="table-th">Item</th>
                  <th class="table-th">Warehouse</th>
                  <th class="table-th">Qty</th>
                  <th class="table-th">Workflow</th>
                  <th class="table-th">Approval</th>
                  <th class="table-th">Unit Cost</th>
                  <th class="table-th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (workflow of workflows(); track workflow.id) {
                  <tr class="table-row">
                    <td class="table-td font-mono text-xs">{{ workflow.grn_number }}</td>
                    <td class="table-td">
                      <p class="font-medium text-gray-900">{{ workflow.item_name }}</p>
                      <p class="text-xs text-gray-500">{{ workflow.item_code }}</p>
                    </td>
                    <td class="table-td">{{ workflow.warehouse_name }}</td>
                    <td class="table-td">{{ formatNumber(workflow.quantity_received, 4) }} {{ workflow.unit_of_measure || 'unit' }}</td>
                    <td class="table-td">
                      <span class="inline-flex px-2.5 py-1 rounded-full text-xs font-medium" [class]="workflowTone(workflow.workflow_status)">
                        {{ workflow.workflow_status }}
                      </span>
                    </td>
                    <td class="table-td">
                      <span class="inline-flex px-2.5 py-1 rounded-full text-xs font-medium" [class]="approvalTone(workflow.approval_status)">
                        {{ workflow.approval_status }}
                      </span>
                    </td>
                    <td class="table-td">{{ formatCurrency(workflow.unit_cost) }}</td>
                    <td class="table-td text-right">
                      <a [routerLink]="['/finance/inventory-workflows', workflow.id]" class="btn-ghost text-xs! whitespace-nowrap">Open workflow</a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination
            [page]="page()"
            [pageSize]="pageSize()"
            [total]="total()"
            (pageChange)="setPage($event)"
            (pageSizeChange)="setPageSize($event)"
          />
        }
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryWorkflowsComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly auth = inject(AuthService);

  readonly dashboard = signal<InventoryFinanceDashboard | null>(null);
  readonly workflows = signal<InventoryFinanceWorkflow[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);

  readonly statusOptions = STATUS_OPTIONS;
  readonly orderOptions = ORDER_OPTIONS;
  searchTerm = '';
  selectedStatus: 'ALL' | InventoryFinanceWorkflowStatus = 'ALL';
  selectedOrdering: (typeof ORDER_OPTIONS)[number]['value'] = '-received_at';

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatNumber = formatNumber;
  readonly canProcessWorkflows = () => canProcessInventoryWorkflows(this.auth);
  readonly canApproveWorkflows = () => canApproveInventoryWorkflows(this.auth);

  readonly hasActiveFilters = computed(() =>
    !!this.searchTerm.trim() || this.selectedStatus !== 'ALL' || this.selectedOrdering !== '-received_at',
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      dashboard: this.finance.getInventoryFinanceDashboard(),
      workflows: this.finance.getInventoryWorkflows({
        page: this.page(),
        page_size: this.pageSize(),
        ordering: this.selectedOrdering,
        search: this.searchTerm.trim() || undefined,
        workflow_status: this.selectedStatus === 'ALL' ? undefined : this.selectedStatus,
      }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ dashboard, workflows }) => {
          this.dashboard.set(dashboard);
          this.workflows.set(workflows.results);
          this.total.set(workflows.count);
        },
        error: () => this.error.set(true),
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'ALL';
    this.selectedOrdering = '-received_at';
    this.page.set(1);
    this.load();
  }

  setPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.load();
  }

  workflowTone(status: InventoryFinanceWorkflowStatus): string {
    switch (status) {
      case 'READY_FOR_SALE':
        return 'bg-emerald-100 text-emerald-800';
      case 'PENDING_FINANCE_APPROVAL':
        return 'bg-amber-100 text-amber-800';
      case 'COSTING_IN_PROGRESS':
      case 'PRICING_IN_PROGRESS':
        return 'bg-sky-100 text-sky-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  approvalTone(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }
}
