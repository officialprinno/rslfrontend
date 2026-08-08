import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import {
  InventoryFinanceDashboard,
  InventoryFinanceWorkflow,
  InventoryFinanceWorkflowStatus,
  OpeningBalancePricingImportResult,
} from '../../../../core/models/finance.model';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { downloadBlob } from '../../../../core/utils/download.util';
import { formatCurrency, formatDate, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
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
    ModalComponent,
  ],
  template: `
    <app-page-header
      title="Finance Inventory Workflows"
      subtitle="Costing, pricing, and READY_FOR_SALE release — from GRNs or opening-balance stock."
    >
      @if (canProcessWorkflows()) {
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn-secondary"
            [disabled]="downloadingTemplate()"
            (click)="downloadTemplate()"
          >
            {{ downloadingTemplate() ? 'Preparing…' : 'Opening Balance Template' }}
          </button>
          <button type="button" class="btn-primary" (click)="openImport()">Import Opening Balance Pricing</button>
        </div>
      }
    </app-page-header>

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
            <p class="text-sm text-gray-500">GRN receipts and opening-balance pricing both appear here. Only Finance Manager can approve READY_FOR_SALE.</p>
            @if (!canApproveWorkflows()) {
              <p class="text-xs text-amber-700 mt-2">You can prepare costing/pricing, but final release requires Finance Manager approval.</p>
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
            <app-table-skeleton [rows]="6" [cols]="9" />
          </div>
        } @else if (!workflows().length) {
          <app-empty-state
            [title]="hasActiveFilters() ? 'No workflows match these filters' : 'No finance workflows found'"
            [message]="hasActiveFilters() ? 'Try clearing the search, status, or sort filters for this company workspace.' : 'Confirm GRNs, or import opening-balance pricing for stock already in warehouses.'"
            [showSwitchCompany]="!hasActiveFilters()"
            moduleName="Finance Inventory Workflows"
            (companySwitched)="load()"
          />
        } @else {
          <div class="overflow-x-auto">
            <table class="enterprise-table w-full">
              <thead>
                <tr>
                  <th class="table-th">Source</th>
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
                    <td class="table-td">
                      <p class="font-mono text-xs text-gray-900">{{ workflow.grn_number }}</p>
                      <p class="text-[11px] text-gray-500">{{ workflow.source_label || workflow.source || 'GRN' }}</p>
                    </td>
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

    <app-modal [open]="showImportModal()" title="Import Opening Balance Pricing" (close)="showImportModal.set(false)">
      <div class="space-y-4">
        <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p class="font-medium text-slate-900">Release catalogue stock for sale (no GRN required)</p>
          <ol class="mt-2 list-decimal space-y-1 pl-5 text-xs leading-5 text-slate-600">
            <li>Items must exist in catalogue and have warehouse stock (Opening Stock / prior receipts).</li>
            <li>Fill sheet <span class="font-medium">Opening Balance Pricing</span>: Item Code, Warehouse, Currency (TZS/USD/EUR), Unit Cost, Selling Price.</li>
            <li>Foreign amounts convert to TZS using Finance → Exchange Rates. Stock is validated per warehouse.</li>
            <li>Failures download as Excel. Successful rows go Pending Approval (or Ready if auto-approve).</li>
          </ol>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn-secondary"
            [disabled]="downloadingTemplate()"
            (click)="downloadTemplate()"
          >
            {{ downloadingTemplate() ? 'Preparing…' : 'Download Template' }}
          </button>
          <button
            type="button"
            class="btn-primary"
            [disabled]="importing()"
            (click)="importInput.click()"
          >
            {{ importing() ? 'Importing…' : 'Upload Excel / CSV' }}
          </button>
          <input
            #importInput
            type="file"
            class="hidden"
            accept=".csv,.xlsx"
            (change)="onImportFileSelected($event)"
          />
        </div>

        <label class="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            class="mt-0.5"
            [ngModel]="autoApproveImport()"
            (ngModelChange)="autoApproveImport.set($event)"
            [disabled]="!canApproveWorkflows()"
          />
          <span>
            <span class="font-medium text-slate-900">Auto-approve READY_FOR_SALE</span>
            <span class="mt-0.5 block text-xs text-slate-500">
              @if (canApproveWorkflows()) {
                Finance Manager only. Applies selling price and releases finance hold immediately.
              } @else {
                Your role cannot auto-approve — rows will stay Pending Finance Approval.
              }
            </span>
          </span>
        </label>

        @if (importResult(); as result) {
          <div class="rounded-xl border border-slate-200 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-semibold text-slate-900">Import summary</p>
              @if (result.failed_count > 0) {
                <button
                  type="button"
                  class="btn-secondary !text-xs"
                  [disabled]="downloadingFailures()"
                  (click)="downloadFailures()"
                >
                  {{ downloadingFailures() ? 'Preparing…' : 'Download Failed Excel' }}
                </button>
              }
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <div class="rounded-lg bg-slate-50 px-3 py-2">
                <p class="text-slate-500">Rows</p>
                <p class="text-base font-semibold text-slate-900">{{ result.total_rows }}</p>
              </div>
              <div class="rounded-lg bg-emerald-50 px-3 py-2">
                <p class="text-emerald-700">Created</p>
                <p class="text-base font-semibold text-emerald-800">{{ result.created_count }}</p>
              </div>
              <div class="rounded-lg bg-indigo-50 px-3 py-2">
                <p class="text-indigo-700">Updated</p>
                <p class="text-base font-semibold text-indigo-800">{{ result.updated_count || 0 }}</p>
              </div>
              <div class="rounded-lg bg-sky-50 px-3 py-2">
                <p class="text-sky-700">Approved</p>
                <p class="text-base font-semibold text-sky-800">{{ result.approved_count }}</p>
              </div>
              <div class="rounded-lg bg-amber-50 px-3 py-2">
                <p class="text-amber-700">Pending</p>
                <p class="text-base font-semibold text-amber-800">{{ result.pending_count }}</p>
              </div>
              <div class="rounded-lg bg-red-50 px-3 py-2">
                <p class="text-red-700">Failed</p>
                <p class="text-base font-semibold text-red-800">{{ result.failed_count }}</p>
              </div>
            </div>

            @if (result.warnings.length) {
              <div class="mt-3 space-y-1">
                @for (warning of result.warnings; track warning) {
                  <p class="text-xs text-amber-700">{{ warning }}</p>
                }
              </div>
            }

            @if (result.errors.length) {
              <div class="mt-4 max-h-48 overflow-auto rounded-lg border border-red-100">
                <table class="w-full text-left text-xs">
                  <thead class="sticky top-0 bg-red-50 text-red-800">
                    <tr>
                      <th class="px-3 py-2 font-semibold">Row</th>
                      <th class="px-3 py-2 font-semibold">Item</th>
                      <th class="px-3 py-2 font-semibold">Warehouse</th>
                      <th class="px-3 py-2 font-semibold">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (err of result.errors; track err.row + (err.item_code || '')) {
                      <tr class="border-t border-red-50">
                        <td class="px-3 py-2 tabular-nums">{{ err.row }}</td>
                        <td class="px-3 py-2 font-mono">{{ err.item_code || '—' }}</td>
                        <td class="px-3 py-2">{{ err.warehouse || '—' }}</td>
                        <td class="px-3 py-2 text-red-700">{{ formatImportError(err.error) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }
      </div>
      <div modalFooter>
        <button type="button" class="btn-secondary" (click)="showImportModal.set(false)">Close</button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryWorkflowsComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly dashboard = signal<InventoryFinanceDashboard | null>(null);
  readonly workflows = signal<InventoryFinanceWorkflow[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly showImportModal = signal(false);
  readonly importing = signal(false);
  readonly downloadingTemplate = signal(false);
  readonly downloadingFailures = signal(false);
  readonly autoApproveImport = signal(false);
  readonly importResult = signal<OpeningBalancePricingImportResult | null>(null);

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

  openImport(): void {
    this.importResult.set(null);
    this.autoApproveImport.set(this.canApproveWorkflows());
    this.showImportModal.set(true);
  }

  downloadTemplate(): void {
    this.downloadingTemplate.set(true);
    this.finance
      .downloadOpeningBalancePricingTemplate()
      .pipe(finalize(() => this.downloadingTemplate.set(false)))
      .subscribe({
        next: (blob) => downloadBlob(blob, 'finance_opening_balance_pricing_template.xlsx'),
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to download template')),
      });
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const filename = file.name.toLowerCase();
    if (!filename.endsWith('.csv') && !filename.endsWith('.xlsx')) {
      this.notification.error('Please upload a CSV or XLSX file.');
      input.value = '';
      return;
    }

    this.importing.set(true);
    this.importResult.set(null);
    this.finance
      .importOpeningBalancePricing(file, this.autoApproveImport())
      .pipe(finalize(() => this.importing.set(false)))
      .subscribe({
        next: (res) => {
          this.importResult.set(res.data);
          const summary =
            `${res.data.created_count} created, ${res.data.updated_count || 0} updated` +
            ` (${res.data.approved_count} approved, ${res.data.pending_count} pending)` +
            `, ${res.data.failed_count} failed.`;
          if (res.data.created_count > 0 || (res.data.updated_count || 0) > 0) {
            this.notification.success(res.warning ? `${summary} ${res.warning}` : summary);
          } else {
            this.notification.error(res.warning || res.message || 'No rows were imported.');
          }
          this.load();
          this.cdr.markForCheck();
        },
        error: (e) => {
          this.notification.error(getApiErrorMessage(e, 'Opening-balance pricing import failed'));
          this.cdr.markForCheck();
        },
      });

    input.value = '';
  }

  downloadFailures(): void {
    const result = this.importResult();
    if (!result?.failed_rows?.length) {
      this.notification.error('No failed rows to download.');
      return;
    }
    this.downloadingFailures.set(true);
    this.finance
      .downloadOpeningBalancePricingFailures(result.failed_rows)
      .pipe(finalize(() => this.downloadingFailures.set(false)))
      .subscribe({
        next: (blob) => downloadBlob(blob, 'finance_opening_balance_pricing_failures.xlsx'),
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to download failures Excel')),
      });
  }

  formatImportError(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error == null) return 'Unknown error';
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
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
