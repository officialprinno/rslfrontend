import { ChangeDetectionStrategy, Component, computed, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { startWith } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import {
  InventoryFinanceWorkflow,
  InventoryPricingMethod,
  InventoryCostMethod,
  InventoryPriceVersion,
} from '../../../../core/models/finance.model';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDateTime, formatNumber } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { canApproveInventoryWorkflows, canProcessInventoryWorkflows } from '../../utils/finance-permissions.util';

type WizardStep = 0 | 1 | 2 | 3;

type CostingFieldName =
  | 'purchase_cost'
  | 'purchase_vat'
  | 'freight'
  | 'insurance'
  | 'import_duty'
  | 'clearing_charges'
  | 'transportation'
  | 'handling_charges'
  | 'other_landed_costs';

type PricingFieldName =
  | 'selling_unit_price'
  | 'wholesale_price'
  | 'retail_price'
  | 'dealer_price'
  | 'customer_price'
  | 'promotional_price'
  | 'markup_percent'
  | 'margin_percent';

const COSTING_FIELDS: Array<{
  name: CostingFieldName;
  label: string;
  help: string;
  placeholder: string;
  required?: boolean;
}> = [
    {
      name: 'purchase_cost',
      label: 'Purchase Cost',
      help: 'Original purchase cost captured from the supplier GRN and invoice basis.',
      placeholder: 'Enter supplier purchase cost',
      required: true,
    },
    {
      name: 'purchase_vat',
      label: 'Purchase VAT (from PO)',
      help: 'VAT allocated from the linked purchase order. Included in landed cost only when company policy capitalizes VAT.',
      placeholder: 'Auto-filled from PO',
    },
    {
      name: 'freight',
      label: 'Freight Cost',
      help: 'Transportation cost charged by the supplier or freight provider.',
      placeholder: 'Enter freight cost',
    },
    {
      name: 'insurance',
      label: 'Insurance Cost',
      help: 'Insurance premium paid to cover this shipment.',
      placeholder: 'Enter insurance cost',
    },
    {
      name: 'import_duty',
      label: 'Import Duty',
      help: 'Import tax or customs duty paid for the goods.',
      placeholder: 'Enter import duty',
    },
    {
      name: 'clearing_charges',
      label: 'Clearing Charges',
      help: 'Customs clearing and documentation costs.',
      placeholder: 'Enter clearing charges',
    },
    {
      name: 'transportation',
      label: 'Transportation',
      help: 'Local transport from port, depot, or supplier to the warehouse.',
      placeholder: 'Enter transportation cost',
    },
    {
      name: 'handling_charges',
      label: 'Handling Charges',
      help: 'Loading, unloading, or warehouse handling charges tied to receipt.',
      placeholder: 'Enter handling charges',
    },
    {
      name: 'other_landed_costs',
      label: 'Other Landed Costs',
      help: 'Any other acquisition cost required to bring the stock into usable condition.',
      placeholder: 'Enter other landed costs',
    },
  ];

const PRICING_FIELDS: Array<{
  name: PricingFieldName;
  label: string;
  help: string;
  placeholder: string;
  prefix?: 'TZS' | '%';
  required?: boolean;
}> = [
    {
      name: 'selling_unit_price',
      label: 'Selling Unit Price',
      help: 'Primary selling price used by Sales orders after finance approval.',
      placeholder: 'Enter selling unit price',
      prefix: 'TZS',
      required: true,
    },
    {
      name: 'wholesale_price',
      label: 'Wholesale Price',
      help: 'Price used for bulk or wholesale channel customers.',
      placeholder: 'Enter wholesale price',
      prefix: 'TZS',
    },
    {
      name: 'retail_price',
      label: 'Retail Price',
      help: 'Front-facing retail price for standard sales.',
      placeholder: 'Enter retail price',
      prefix: 'TZS',
    },
    {
      name: 'dealer_price',
      label: 'Dealer Price',
      help: 'Special price reserved for dealer or distributor channels.',
      placeholder: 'Enter dealer price',
      prefix: 'TZS',
    },
    {
      name: 'customer_price',
      label: 'Customer / Minimum Selling Price',
      help: 'Lowest approved customer-facing price using the existing customer price field.',
      placeholder: 'Enter minimum customer price',
      prefix: 'TZS',
    },
    {
      name: 'promotional_price',
      label: 'Promotional Price',
      help: 'Optional promotional price for approved campaigns or temporary offers.',
      placeholder: 'Enter promotional price',
      prefix: 'TZS',
    },
    {
      name: 'markup_percent',
      label: 'Markup %',
      help: 'Percentage increase from unit cost to selling unit price.',
      placeholder: 'Enter markup percent',
      prefix: '%',
    },
    {
      name: 'margin_percent',
      label: 'Margin %',
      help: 'Expected gross margin percentage at the current selling unit price.',
      placeholder: 'Enter margin percent',
      prefix: '%',
    },
  ];

const COST_METHOD_OPTIONS: Array<{ value: InventoryCostMethod; label: string }> = [
  { value: 'FIFO', label: 'FIFO' },
  { value: 'WEIGHTED_AVERAGE', label: 'Weighted Average' },
  { value: 'STANDARD_COST', label: 'Standard Cost' },
];

const PRICING_METHOD_OPTIONS: Array<{ value: InventoryPricingMethod; label: string }> = [
  { value: 'FIXED', label: 'Fixed Price' },
  { value: 'MARKUP', label: 'Markup Pricing' },
  { value: 'MARGIN', label: 'Margin Pricing' },
];

@Component({
  selector: 'app-inventory-workflow-detail',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    FinanceNavComponent,
    PageHeaderComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  template: `
    <app-page-header
      title="Inventory Finance Workflow"
      [subtitle]="workflow() ? workflow()!.grn_number + ' · ' + workflow()!.item_name : 'Loading finance workflow'"
    >
      <a routerLink="/finance/inventory-workflows" class="btn-ghost">Back to queue</a>
    </app-page-header>

    <app-finance-nav />

    @if (error()) {
      <app-error-state
        title="Unable to load workflow"
        message="The workflow may belong to a different company workspace or no longer exist."
        (retry)="load()"
      />
    } @else if (loading()) {
      <app-table-skeleton [rows]="5" [cols]="4" />
    } @else if (workflow(); as workflow) {
      <section class="card p-5 border border-gray-200 mb-6 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_45%,#f4f7fb_100%)]">
        <div class="flex flex-col 2xl:flex-row gap-6 2xl:items-start 2xl:justify-between">
          <div class="space-y-4 flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Workflow: {{ prettyStatus(workflow.workflow_status) }}
              </span>
              <span class="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                Approval: {{ prettyStatus(workflow.approval_status) }}
              </span>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.22em] text-slate-500">Finance Release Workflow</p>
              <h2 class="text-2xl font-semibold text-slate-900 mt-2">{{ workflow.item_name }}</h2>
              <p class="text-sm text-slate-500 mt-2">
                Finance owns costing, pricing, review, and final approval before Sales can reserve or sell this stock.
              </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <article class="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <p class="text-xs uppercase tracking-wide text-slate-500">Quantity Received</p>
                <p class="text-xl font-semibold text-slate-900 mt-2">{{ formatNumber(workflow.quantity_received, 4) }} {{ workflow.unit_of_measure || 'unit' }}</p>
                <p class="text-xs text-slate-500 mt-1">Physically in warehouse custody</p>
              </article>
              <article class="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <p class="text-xs uppercase tracking-wide text-slate-500">Current Landed Cost</p>
                <p class="text-xl font-semibold text-slate-900 mt-2">{{ formatCurrency(currentLandedCost()) }}</p>
                <p class="text-xs text-slate-500 mt-1">
                  @if (vatIncludedInLandedCost()) {
                    Includes purchase VAT in inventory cost
                  } @else {
                    Ex-VAT goods + other costs (VAT tracked separately)
                  }
                </p>
              </article>
              <article class="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <p class="text-xs uppercase tracking-wide text-slate-500">Calculated Unit Cost</p>
                <p class="text-xl font-semibold text-slate-900 mt-2">{{ formatCurrency(calculatedUnitCost()) }}</p>
                <p class="text-xs text-slate-500 mt-1">Landed cost divided by received quantity</p>
              </article>
              <article class="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
                <p class="text-xs uppercase tracking-wide text-emerald-700">Release Rule</p>
                <p class="text-sm font-semibold text-slate-900 mt-2">Sales sees this stock only after finance approval.</p>
                <p class="text-xs text-slate-600 mt-1">Approval updates price and releases finance-held stock.</p>
              </article>
            </div>
          </div>
          <aside class="w-full 2xl:max-w-sm rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Workflow Progress</p>
            <div class="mt-4 space-y-3">
              <div class="flex items-center justify-between rounded-2xl border px-3 py-3" [class]="progressTone(costingCompleted())">
                <div>
                  <p class="text-sm font-semibold text-slate-900">Costing</p>
                  <p class="text-xs text-slate-500">{{ costingCompleted() ? 'Completed' : 'Pending finance costing submission' }}</p>
                </div>
                <span class="text-xs font-semibold">{{ costingCompleted() ? 'Completed' : 'Pending' }}</span>
              </div>
              <div class="flex items-center justify-between rounded-2xl border px-3 py-3" [class]="progressTone(pricingCompleted())">
                <div>
                  <p class="text-sm font-semibold text-slate-900">Pricing</p>
                  <p class="text-xs text-slate-500">{{ pricingCompleted() ? 'Completed' : 'Pending finance pricing preparation' }}</p>
                </div>
                <span class="text-xs font-semibold">{{ pricingCompleted() ? 'Completed' : 'Pending' }}</span>
              </div>
              <div class="flex items-center justify-between rounded-2xl border px-3 py-3" [class]="progressTone(approvalCompleted())">
                <div>
                  <p class="text-sm font-semibold text-slate-900">Finance Approval</p>
                  <p class="text-xs text-slate-500">{{ approvalCompleted() ? 'Approved and released to sales' : 'Waiting for final finance decision' }}</p>
                </div>
                <span class="text-xs font-semibold">{{ approvalCompleted() ? 'Completed' : 'Pending' }}</span>
              </div>
            </div>
            @if (approvalBlockingReason().length) {
              <div class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p class="text-sm font-semibold text-amber-900">Approval is blocked</p>
                <ul class="mt-2 space-y-1 text-xs text-amber-800 list-disc pl-4">
                  @for (reason of approvalBlockingReason(); track reason) {
                    <li>{{ reason }}</li>
                  }
                </ul>
              </div>
            }
          </aside>
        </div>
      </section>

      @if (workflow.po_number) {
        <section class="card p-5 border border-slate-200 mb-6 bg-white">
          <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">PO / GRN Reference</p>
              <h3 class="text-lg font-semibold text-slate-900 mt-2">{{ workflow.po_number }}</h3>
              <p class="text-sm text-slate-500 mt-1">Linked purchase order tax breakdown vs inventory costing basis</p>
            </div>
            @if (canApproveFinanceActions()) {
              <label class="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 max-w-md cursor-pointer">
                <input
                  type="checkbox"
                  class="mt-1"
                  [checked]="workflow.capitalize_purchase_vat_in_inventory"
                  (change)="toggleCapitalizeVat($event)"
                />
                <span class="text-sm text-slate-700">
                  <span class="font-semibold text-slate-900 block">Capitalize purchase VAT in inventory cost</span>
                  Off = recoverable input VAT (posted to VAT Receivable). On = VAT included in unit cost.
                </span>
              </label>
            }
          </div>
          <dl class="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <dt class="text-slate-500">Goods value (ex-VAT)</dt>
              <dd class="font-semibold text-slate-900 mt-1">{{ formatCurrency(workflow.po_subtotal ?? workflow.goods_value_ex_vat ?? 0) }}</dd>
            </div>
            <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <dt class="text-amber-800">Purchase VAT</dt>
              <dd class="font-semibold text-amber-900 mt-1">{{ formatCurrency(workflow.po_tax_amount ?? workflow.purchase_vat) }}</dd>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <dt class="text-slate-500">PO total (incl. VAT)</dt>
              <dd class="font-semibold text-slate-900 mt-1">{{ formatCurrency(workflow.po_total ?? 0) }}</dd>
            </div>
            <div class="rounded-2xl border border-[#1B3A6B]/10 bg-blue-50 px-4 py-3">
              <dt class="text-slate-600">In costing now</dt>
              <dd class="font-semibold text-[#1B3A6B] mt-1">{{ formatCurrency(currentLandedCost()) }}</dd>
              <dd class="text-xs text-slate-500 mt-1">
                @if (vatIncludedInLandedCost()) {
                  VAT included in landed cost
                } @else {
                  VAT {{ formatCurrency(purchaseVatAmount()) }} excluded — Input VAT recoverable
                }
              </dd>
            </div>
          </dl>
        </section>
      }

      <section class="card p-4 border border-slate-200 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          @for (step of wizardSteps; track step.index) {
            <button
              type="button"
              class="rounded-2xl border p-4 text-left transition-all"
              [class]="stepCardTone(step.index)"
              (click)="activeStep.set(step.index)"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Step {{ step.index + 1 }}</p>
                  <p class="text-base font-semibold text-slate-900 mt-2">{{ step.title }}</p>
                  <p class="text-xs text-slate-500 mt-1">{{ step.caption }}</p>
                </div>
                <span class="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold" [class]="stepBadgeTone(step.index)">
                  {{ step.index + 1 }}
                </span>
              </div>
            </button>
          }
        </div>
      </section>

      @if (activeStep() === 0) {
        <section class="grid grid-cols-1 2xl:grid-cols-[1.15fr_0.85fr] gap-6 mb-6">
          <article class="card p-6 border border-slate-200">
            <div class="flex items-start justify-between gap-4 mb-6">
              <div>
                <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Step 1</p>
                <h3 class="text-xl font-semibold text-slate-900 mt-2">Inventory Costing</h3>
                <p class="text-sm text-slate-500 mt-2">Finance enters landed cost components and reviews the calculated unit cost before submission.</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <p class="text-xs uppercase tracking-wide text-slate-500">Received</p>
                <p class="text-lg font-semibold text-slate-900 mt-2">{{ formatDateTime(workflow.received_at) }}</p>
                <p class="text-xs text-slate-500 mt-1">Warehouse: {{ workflow.warehouse_name }}</p>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500">Product</p>
                <p class="text-lg font-semibold text-slate-900 mt-2">{{ workflow.item_name }}</p>
                <p class="text-sm text-slate-500 mt-1">{{ workflow.item_code }}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500">Quantity Received</p>
                <p class="text-lg font-semibold text-slate-900 mt-2">{{ formatNumber(workflow.quantity_received, 4) }} {{ workflow.unit_of_measure || 'unit' }}</p>
                <p class="text-sm text-slate-500 mt-1">Used to compute unit cost automatically</p>
              </div>
            </div>

            @if (canProcessFinanceActions()) {
              <form [formGroup]="costingForm" class="space-y-6" (ngSubmit)="submitCosting()">
                <div>
                  <label class="block text-sm font-semibold text-slate-900 mb-2">Costing Method</label>
                  <select class="input-field w-full" formControlName="cost_method">
                    <option [ngValue]="null">Select Costing Method</option>
                    @for (method of costMethodOptions; track method.value) {
                      <option [ngValue]="method.value">{{ method.label }}</option>
                    }
                  </select>
                  <p class="mt-2 text-xs text-slate-500">Choose how Finance wants the system to interpret this inventory cost release.</p>
                  @if (costingControlInvalid('cost_method')) {
                    <p class="mt-1 text-xs text-rose-600">Costing method is required before submitting.</p>
                  }
                </div>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  @for (field of costingFields; track field.name) {
                    <div class="rounded-2xl border border-slate-200 bg-white p-4" [class]="field.name === 'purchase_vat' ? 'xl:col-span-2 border-amber-200 bg-amber-50/40' : ''">
                      <label class="block text-sm font-semibold text-slate-900">{{ field.label }}</label>
                      <p class="mt-1 text-xs text-slate-500">{{ field.help }}</p>
                      <div class="mt-3 flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-[#1B3A6B]">
                        <span class="inline-flex items-center border-r border-slate-200 px-3 text-xs font-semibold text-slate-500">TZS</span>
                        <input
                          class="w-full bg-transparent px-3 py-3 text-sm text-slate-900 outline-none"
                          type="number"
                          step="0.01"
                          min="0"
                          [placeholder]="field.placeholder"
                          [formControlName]="field.name"
                        />
                      </div>
                      @if (costingControlInvalid(field.name)) {
                        <p class="mt-2 text-xs text-rose-600">
                          {{ field.required ? field.label + ' is required.' : field.label + ' must be zero or greater.' }}
                        </p>
                      }
                    </div>
                  }
                </div>

                <div class="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-4">
                  <div class="text-xs text-slate-500">Submit only after reviewing the live landed-cost summary on the right.</div>
                  <div class="flex gap-3">
                    <button type="button" class="btn-secondary" (click)="activeStep.set(1)">Next: Pricing</button>
                    <button type="submit" class="btn-primary" [disabled]="submitting() || costingForm.invalid || !canSubmitCosting()">
                      {{ submitting() ? 'Submitting...' : 'Submit Costing' }}
                    </button>
                  </div>
                </div>
              </form>
            } @else {
              <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                Your role can review this workflow, but costing inputs are available only to Finance processing users.
              </div>
            }
          </article>

          <aside class="card p-6 border border-slate-200 bg-slate-50/60">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Live Costing Summary</p>
              <h3 class="text-xl font-semibold text-slate-900 mt-2">Review before submission</h3>
              <p class="text-sm text-slate-500 mt-2">The system recalculates landed cost and unit cost as Finance types.</p>
            </div>
            <dl class="mt-6 space-y-3">
              @for (field of costingFields; track field.name) {
                @if (field.name !== 'purchase_vat') {
                <div class="flex items-center justify-between gap-4 rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                  <dt>
                    <p class="text-sm font-medium text-slate-900">{{ field.label }}</p>
                    <p class="text-xs text-slate-500">{{ field.help }}</p>
                  </dt>
                  <dd class="text-sm font-semibold text-slate-900">{{ formatCurrency(costValue(field.name)) }}</dd>
                </div>
                }
              }
            </dl>
            <div class="mt-4 rounded-2xl border px-4 py-3" [class]="vatIncludedInLandedCost() ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold text-slate-900">Purchase VAT (from PO)</p>
                  <p class="text-xs text-slate-600 mt-1">
                    @if (vatIncludedInLandedCost()) {
                      Included in total landed cost below
                    } @else {
                      Shown for reference — excluded from inventory unit cost
                    }
                  </p>
                </div>
                <p class="text-sm font-semibold text-slate-900">{{ formatCurrency(purchaseVatAmount()) }}</p>
              </div>
            </div>
            <div class="mt-4 rounded-3xl border border-[#1B3A6B]/10 bg-[#1B3A6B] p-5 text-white shadow-lg">
              <div class="flex items-center justify-between text-sm">
                <span>Total Landed Cost</span>
                <strong class="text-lg">{{ formatCurrency(currentLandedCost()) }}</strong>
              </div>
              <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div class="rounded-2xl bg-white/10 px-4 py-3">
                  <p class="text-xs uppercase tracking-wide text-white/70">Quantity</p>
                  <p class="text-lg font-semibold mt-1">{{ formatNumber(quantityReceived(), 4) }}</p>
                </div>
                <div class="rounded-2xl bg-white/10 px-4 py-3">
                  <p class="text-xs uppercase tracking-wide text-white/70">Unit Cost</p>
                  <p class="text-lg font-semibold mt-1">{{ formatCurrency(calculatedUnitCost()) }}</p>
                </div>
                <div class="rounded-2xl bg-white/10 px-4 py-3 col-span-2">
                  <p class="text-xs uppercase tracking-wide text-white/70">Inventory Value</p>
                  <p class="text-lg font-semibold mt-1">{{ formatCurrency(inventoryValue()) }}</p>
                </div>
              </div>
            </div>
          </aside>
        </section>
      }

      @if (activeStep() === 1) {
        <section class="grid grid-cols-1 2xl:grid-cols-[1.15fr_0.85fr] gap-6 mb-6">
          <article class="card p-6 border border-slate-200">
            <div class="mb-6">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Step 2</p>
              <h3 class="text-xl font-semibold text-slate-900 mt-2">Pricing</h3>
              <p class="text-sm text-slate-500 mt-2">Prepare pricing after costing so Finance can review markup, margin, and channel prices clearly.</p>
            </div>

            @if (canProcessFinanceActions()) {
              <form [formGroup]="pricingForm" class="space-y-6" (ngSubmit)="submitPricing()">
                <div>
                  <label class="block text-sm font-semibold text-slate-900 mb-2">Pricing Method</label>
                  <select class="input-field w-full" formControlName="pricing_method">
                    <option [ngValue]="null">Select Pricing Method</option>
                    @for (method of pricingMethodOptions; track method.value) {
                      <option [ngValue]="method.value">{{ method.label }}</option>
                    }
                  </select>
                  <p class="mt-2 text-xs text-slate-500">Choose how this selling price was prepared so the history remains auditable.</p>
                  @if (pricingControlInvalid('pricing_method')) {
                    <p class="mt-1 text-xs text-rose-600">Pricing method is required before submitting.</p>
                  }
                </div>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  @for (field of pricingFields; track field.name) {
                    <div class="rounded-2xl border border-slate-200 bg-white p-4">
                      <label class="block text-sm font-semibold text-slate-900">{{ field.label }}</label>
                      <p class="mt-1 text-xs text-slate-500">{{ field.help }}</p>
                      <div class="mt-3 flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-[#1B3A6B]">
                        <span class="inline-flex items-center border-r border-slate-200 px-3 text-xs font-semibold text-slate-500">{{ field.prefix || 'TZS' }}</span>
                        <input
                          class="w-full bg-transparent px-3 py-3 text-sm text-slate-900 outline-none"
                          type="number"
                          step="0.01"
                          min="0"
                          [placeholder]="field.placeholder"
                          [formControlName]="field.name"
                        />
                      </div>
                      @if (pricingControlInvalid(field.name)) {
                        <p class="mt-2 text-xs text-rose-600">
                          {{ field.required ? field.label + ' is required.' : field.label + ' must be zero or greater.' }}
                        </p>
                      }
                    </div>
                  }
                </div>

                <div class="rounded-2xl border border-slate-200 bg-white p-4">
                  <label class="block text-sm font-semibold text-slate-900">Pricing Notes</label>
                  <p class="mt-1 text-xs text-slate-500">Optional explanation for why this price version was prepared.</p>
                  <textarea class="input-field mt-3 min-h-28 w-full" placeholder="Explain pricing assumptions or approvals" formControlName="notes"></textarea>
                </div>

                <div class="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-4">
                  <div class="text-xs text-slate-500">Pricing is enabled only after Finance has a cost basis to work from.</div>
                  <div class="flex gap-3">
                    <button type="button" class="btn-secondary" (click)="activeStep.set(0)">Back to Costing</button>
                    <button type="button" class="btn-secondary" (click)="activeStep.set(2)">Next: Review</button>
                    <button type="submit" class="btn-primary" [disabled]="submitting() || pricingForm.invalid || !canPreparePricing()">
                      {{ submitting() ? 'Submitting...' : 'Prepare Pricing' }}
                    </button>
                  </div>
                </div>
              </form>
            } @else {
              <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                Your role can review this workflow, but pricing inputs are available only to Finance processing users.
              </div>
            }
          </article>

          <aside class="card p-6 border border-slate-200 bg-slate-50/60">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Live Pricing Review</p>
              <h3 class="text-xl font-semibold text-slate-900 mt-2">Expected outcome</h3>
              <p class="text-sm text-slate-500 mt-2">Finance can see margin and markup before creating a new price version.</p>
            </div>

            <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                <p class="text-xs uppercase tracking-wide text-slate-500">Selling Price</p>
                <p class="text-lg font-semibold text-slate-900 mt-2">{{ formatCurrency(sellingPrice()) }}</p>
              </div>
              <div class="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                <p class="text-xs uppercase tracking-wide text-slate-500">Calculated Margin</p>
                <p class="text-lg font-semibold text-slate-900 mt-2">{{ formatPercent(liveMarginPercent()) }}</p>
              </div>
              <div class="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                <p class="text-xs uppercase tracking-wide text-slate-500">Calculated Markup</p>
                <p class="text-lg font-semibold text-slate-900 mt-2">{{ formatPercent(liveMarkupPercent()) }}</p>
              </div>
              <div class="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                <p class="text-xs uppercase tracking-wide text-slate-500">Gross Profit / Unit</p>
                <p class="text-lg font-semibold text-slate-900 mt-2">{{ formatCurrency(expectedGrossProfit()) }}</p>
              </div>
            </div>

            <dl class="mt-4 space-y-3">
              @for (field of pricingFields; track field.name) {
                <div class="flex items-center justify-between gap-4 rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                  <dt>
                    <p class="text-sm font-medium text-slate-900">{{ field.label }}</p>
                    <p class="text-xs text-slate-500">{{ field.help }}</p>
                  </dt>
                  <dd class="text-sm font-semibold text-slate-900">
                    {{ field.prefix === '%' ? formatPercent(pricingValue(field.name)) : formatCurrency(pricingValue(field.name)) }}
                  </dd>
                </div>
              }
            </dl>
          </aside>
        </section>
      }

      @if (activeStep() === 2) {
        <section class="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6 mb-6">
          <article class="card p-6 border border-slate-200">
            <div class="mb-6">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Step 3</p>
              <h3 class="text-xl font-semibold text-slate-900 mt-2">Review</h3>
              <p class="text-sm text-slate-500 mt-2">Check the final costing and pricing summary before moving to approval.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500">Inventory Cost</p>
                <p class="text-2xl font-semibold text-slate-900 mt-2">{{ formatCurrency(currentLandedCost()) }}</p>
                <p class="text-xs text-slate-500 mt-1">Total landed cost from costing inputs</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500">Selling Price</p>
                <p class="text-2xl font-semibold text-slate-900 mt-2">{{ formatCurrency(sellingPrice()) }}</p>
                <p class="text-xs text-slate-500 mt-1">Primary selling price to be enforced for Sales</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500">Quantity</p>
                <p class="text-lg font-semibold text-slate-900 mt-2">{{ formatNumber(quantityReceived(), 4) }}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500">Unit Cost</p>
                <p class="text-lg font-semibold text-slate-900 mt-2">{{ formatCurrency(calculatedUnitCost()) }}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500">Expected Margin</p>
                <p class="text-lg font-semibold text-slate-900 mt-2">{{ formatPercent(liveMarginPercent()) }}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500">Markup</p>
                <p class="text-lg font-semibold text-slate-900 mt-2">{{ formatPercent(liveMarkupPercent()) }}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500">Warehouse</p>
                <p class="text-lg font-semibold text-slate-900 mt-2">{{ workflow.warehouse_name }}</p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <p class="text-xs uppercase tracking-wide text-slate-500">Finance Status</p>
                <p class="text-lg font-semibold text-slate-900 mt-2">{{ prettyStatus(workflow.workflow_status) }}</p>
              </div>
            </div>
            <div class="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
              <button type="button" class="btn-secondary" (click)="activeStep.set(1)">Back to Pricing</button>
              <button type="button" class="btn-primary" (click)="activeStep.set(3)">Continue to Approval</button>
            </div>
          </article>

          <aside class="card p-6 border border-slate-200 bg-slate-50/60">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Checklist</p>
            <h3 class="text-xl font-semibold text-slate-900 mt-2">Release readiness</h3>
            <div class="mt-5 space-y-3">
              <div class="rounded-2xl border px-4 py-3" [class]="progressTone(costingCompleted())">
                <p class="text-sm font-semibold text-slate-900">Costing</p>
                <p class="text-xs text-slate-500 mt-1">{{ costingCompleted() ? 'Completed and ready for pricing review' : 'Still pending submission' }}</p>
              </div>
              <div class="rounded-2xl border px-4 py-3" [class]="progressTone(pricingCompleted())">
                <p class="text-sm font-semibold text-slate-900">Pricing</p>
                <p class="text-xs text-slate-500 mt-1">{{ pricingCompleted() ? 'Price version prepared for approval' : 'Still pending preparation' }}</p>
              </div>
              <div class="rounded-2xl border px-4 py-3" [class]="progressTone(approvalCompleted())">
                <p class="text-sm font-semibold text-slate-900">Finance Approval</p>
                <p class="text-xs text-slate-500 mt-1">{{ approvalCompleted() ? 'Released to sales successfully' : 'Pending final approval' }}</p>
              </div>
            </div>

            @if (approvalBlockingReason().length) {
              <div class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p class="text-sm font-semibold text-amber-900">What is still missing?</p>
                <ul class="mt-2 space-y-1 list-disc pl-4 text-xs text-amber-800">
                  @for (reason of approvalBlockingReason(); track reason) {
                    <li>{{ reason }}</li>
                  }
                </ul>
              </div>
            }
          </aside>
        </section>
      }

      @if (activeStep() === 3) {
        <section class="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-6 mb-6">
          <article class="card p-6 border border-slate-200 bg-slate-50/60">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Step 4</p>
              <h3 class="text-xl font-semibold text-slate-900 mt-2">Finance Approval</h3>
              <p class="text-sm text-slate-500 mt-2">Approval remains disabled until costing and pricing are both complete and valid.</p>
            </div>
            <div class="mt-6 space-y-3">
              <div class="flex items-center justify-between rounded-2xl border px-4 py-3" [class]="progressTone(costingCompleted())">
                <span class="text-sm font-semibold text-slate-900">Costing</span>
                <span class="text-xs font-semibold">{{ costingCompleted() ? 'Completed' : 'Pending' }}</span>
              </div>
              <div class="flex items-center justify-between rounded-2xl border px-4 py-3" [class]="progressTone(pricingCompleted())">
                <span class="text-sm font-semibold text-slate-900">Pricing</span>
                <span class="text-xs font-semibold">{{ pricingCompleted() ? 'Completed' : 'Pending' }}</span>
              </div>
              <div class="flex items-center justify-between rounded-2xl border px-4 py-3" [class]="progressTone(approvalCompleted())">
                <span class="text-sm font-semibold text-slate-900">Finance Approval</span>
                <span class="text-xs font-semibold">{{ approvalCompleted() ? 'Completed' : 'Pending' }}</span>
              </div>
            </div>

            @if (approvalBlockingReason().length) {
              <div class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p class="text-sm font-semibold text-amber-900">Approval requirements</p>
                <ul class="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-800">
                  @for (reason of approvalBlockingReason(); track reason) {
                    <li>{{ reason }}</li>
                  }
                </ul>
              </div>
            }
          </article>

          <article class="card p-6 border border-amber-200 bg-white">
            @if (canApproveFinanceActions()) {
              <form [formGroup]="approvalForm" class="space-y-5" (ngSubmit)="approveWorkflow()">
                <div>
                  <label class="block text-sm font-semibold text-slate-900">Approval Note</label>
                  <p class="mt-1 text-xs text-slate-500">Document the reason for release, special pricing justification, or approval reference.</p>
                  <textarea class="input-field mt-3 min-h-40 w-full" placeholder="Enter approval note or decision reason" formControlName="reason"></textarea>
                </div>

                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-sm font-semibold text-slate-900">Release impact</p>
                  <ul class="mt-2 space-y-1 text-xs text-slate-600 list-disc pl-4">
                    <li>Item unit cost will update to {{ formatCurrency(calculatedUnitCost()) }}</li>
                    <li>Sales selling price will update to {{ formatCurrency(sellingPrice()) }}</li>
                    <li>Finance-held quantity will move into saleable visibility</li>
                  </ul>
                </div>

                <div class="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-4">
                  <button type="button" class="btn-secondary" (click)="activeStep.set(2)">Back to Review</button>
                  <button type="submit" class="btn-primary" [disabled]="submitting() || !canApproveRelease()">
                    {{ submitting() ? 'Approving...' : 'Approve READY_FOR_SALE' }}
                  </button>
                </div>
              </form>
            } @else {
              <div class="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
                Final release is restricted to Finance Manager, HOD Finance, or another user with finance approval rights.
              </div>
            }
          </article>
        </section>
      }

      <section class="card p-5 border border-gray-200">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p class="text-base font-semibold text-gray-900">Price History</p>
            <p class="text-sm text-gray-500">Every pricing change remains versioned and auditable.</p>
          </div>
        </div>
        @if (!priceHistory().length) {
          <p class="text-sm text-gray-500">No price versions created yet.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="enterprise-table w-full">
              <thead>
                <tr>
                  <th class="table-th">Version</th>
                  <th class="table-th">Method</th>
                  <th class="table-th">Selling Price</th>
                  <th class="table-th">Status</th>
                  <th class="table-th">Effective</th>
                  <th class="table-th">Approved By</th>
                </tr>
              </thead>
              <tbody>
                @for (version of priceHistory(); track version.id) {
                  <tr class="table-row">
                    <td class="table-td">v{{ version.version_number }}</td>
                    <td class="table-td">{{ version.pricing_method }}</td>
                    <td class="table-td">{{ formatCurrency(version.selling_unit_price) }}</td>
                    <td class="table-td">
                      <span class="inline-flex px-2.5 py-1 rounded-full text-xs font-medium" [class]="approvalTone(version.approval_status)">
                        {{ prettyStatus(version.approval_status) }}
                      </span>
                    </td>
                    <td class="table-td">{{ formatDateTime(version.effective_date) }}</td>
                    <td class="table-td">{{ version.approved_by_name || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryWorkflowDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly finance = inject(FinanceService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly activeStep = signal<WizardStep>(0);

  readonly workflow = signal<InventoryFinanceWorkflow | null>(null);
  readonly currentApprovedPrice = signal<InventoryPriceVersion | null>(null);
  readonly priceHistory = signal<InventoryPriceVersion[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly submitting = signal(false);

  readonly costingFields = COSTING_FIELDS;
  readonly pricingFields = PRICING_FIELDS;
  readonly costMethodOptions = COST_METHOD_OPTIONS;
  readonly pricingMethodOptions = PRICING_METHOD_OPTIONS;
  readonly wizardSteps = [
    { index: 0 as WizardStep, title: 'Inventory Costing', caption: 'Capture landed cost inputs' },
    { index: 1 as WizardStep, title: 'Pricing', caption: 'Prepare sell-side pricing' },
    { index: 2 as WizardStep, title: 'Review', caption: 'Check summaries before approval' },
    { index: 3 as WizardStep, title: 'Finance Approval', caption: 'Release for sale when complete' },
  ];

  readonly formatCurrency = formatCurrency;
  readonly formatDateTime = formatDateTime;
  readonly formatNumber = formatNumber;

  readonly costingForm = this.fb.group({
    cost_method: this.fb.control<InventoryCostMethod | null>(null, Validators.required),
    purchase_cost: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    purchase_vat: this.fb.control<number | null>(null, Validators.min(0)),
    freight: this.fb.control<number | null>(null, Validators.min(0)),
    insurance: this.fb.control<number | null>(null, Validators.min(0)),
    import_duty: this.fb.control<number | null>(null, Validators.min(0)),
    clearing_charges: this.fb.control<number | null>(null, Validators.min(0)),
    transportation: this.fb.control<number | null>(null, Validators.min(0)),
    handling_charges: this.fb.control<number | null>(null, Validators.min(0)),
    other_landed_costs: this.fb.control<number | null>(null, Validators.min(0)),
  });

  readonly pricingForm = this.fb.group({
    pricing_method: this.fb.control<InventoryPricingMethod | null>(null, Validators.required),
    selling_unit_price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    wholesale_price: this.fb.control<number | null>(null, Validators.min(0)),
    retail_price: this.fb.control<number | null>(null, Validators.min(0)),
    dealer_price: this.fb.control<number | null>(null, Validators.min(0)),
    customer_price: this.fb.control<number | null>(null, Validators.min(0)),
    promotional_price: this.fb.control<number | null>(null, Validators.min(0)),
    markup_percent: this.fb.control<number | null>(null, Validators.min(0)),
    margin_percent: this.fb.control<number | null>(null, Validators.min(0)),
    notes: this.fb.nonNullable.control(''),
  });

  readonly approvalForm = this.fb.group({
    reason: this.fb.nonNullable.control(''),
  });

  readonly costingSnapshot = toSignal(
    this.costingForm.valueChanges.pipe(startWith(this.costingForm.getRawValue())),
    { initialValue: this.costingForm.getRawValue() },
  );
  readonly pricingSnapshot = toSignal(
    this.pricingForm.valueChanges.pipe(startWith(this.pricingForm.getRawValue())),
    { initialValue: this.pricingForm.getRawValue() },
  );

  readonly quantityReceived = computed(() => Number(this.workflow()?.quantity_received || 0));
  readonly vatIncludedInLandedCost = computed(
    () => this.workflow()?.vat_included_in_landed_cost === true,
  );
  readonly purchaseVatAmount = computed(() => this.costValue('purchase_vat'));
  readonly currentLandedCost = computed(() => {
    const base = this.costingFields
      .filter((field) => field.name !== 'purchase_vat')
      .reduce((sum, field) => sum + this.costValue(field.name), 0);
    if (this.vatIncludedInLandedCost()) {
      return base + this.purchaseVatAmount();
    }
    return base;
  });
  readonly calculatedUnitCost = computed(() => {
    const qty = this.quantityReceived();
    return qty > 0 ? this.currentLandedCost() / qty : 0;
  });
  readonly inventoryValue = computed(() => this.calculatedUnitCost() * this.quantityReceived());
  readonly sellingPrice = computed(() => this.pricingValue('selling_unit_price'));
  readonly expectedGrossProfit = computed(() => Math.max(this.sellingPrice() - this.calculatedUnitCost(), 0));
  readonly liveMarkupPercent = computed(() => {
    const cost = this.calculatedUnitCost();
    const sell = this.sellingPrice();
    if (cost <= 0 || sell <= 0) return this.pricingValue('markup_percent');
    return ((sell - cost) / cost) * 100;
  });
  readonly liveMarginPercent = computed(() => {
    const cost = this.calculatedUnitCost();
    const sell = this.sellingPrice();
    if (sell <= 0) return this.pricingValue('margin_percent');
    return ((sell - cost) / sell) * 100;
  });
  readonly costingCompleted = computed(() => {
    const workflow = this.workflow();
    return !!workflow && workflow.workflow_status !== 'RECEIVED';
  });
  readonly pricingCompleted = computed(() => {
    const workflow = this.workflow();
    return !!workflow && (
      workflow.approval_status === 'PENDING' ||
      workflow.approval_status === 'APPROVED' ||
      this.priceHistory().length > 0
    );
  });
  readonly approvalCompleted = computed(() => this.workflow()?.approval_status === 'APPROVED');
  readonly approvalBlockingReason = computed(() => {
    const reasons: string[] = [];
    if (!this.costingCompleted()) {
      reasons.push('Costing must be submitted and completed first.');
    }
    if (!this.pricingCompleted()) {
      reasons.push('Pricing must be prepared before finance approval.');
    }
    if (!this.canApproveFinanceActions()) {
      reasons.push('Your role does not have finance approval permission.');
    }
    return reasons;
  });
  readonly canSubmitCosting = computed(() => {
    const workflow = this.workflow();
    return !!workflow && this.canProcessFinanceActions() && workflow.workflow_status !== 'READY_FOR_SALE';
  });
  readonly canPreparePricing = computed(() => {
    const workflow = this.workflow();
    return !!workflow && this.canProcessFinanceActions() && workflow.workflow_status !== 'READY_FOR_SALE' && this.currentLandedCost() > 0;
  });
  readonly canApproveRelease = computed(() => {
    const workflow = this.workflow();
    return !!workflow && this.canApproveFinanceActions() && this.costingCompleted() && this.pricingCompleted() && workflow.workflow_status === 'PENDING_FINANCE_APPROVAL';
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      workflow: this.finance.getInventoryWorkflow(id),
      currentApprovedPrice: this.finance.getCurrentApprovedPrice(id),
      priceHistory: this.finance.getInventoryPriceHistory(id),
    }).subscribe({
      next: ({ workflow, currentApprovedPrice, priceHistory }) => {
        this.workflow.set(workflow);
        this.currentApprovedPrice.set(currentApprovedPrice);
        this.priceHistory.set(priceHistory);
        this.patchForms(workflow, priceHistory[0] || null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  submitCosting(): void {
    const workflow = this.workflow();
    if (!workflow || this.costingForm.invalid || !this.canSubmitCosting()) return;
    this.submitting.set(true);
    const raw = this.costingForm.getRawValue();
    this.finance
      .submitInventoryCosting(workflow.id, {
        ...raw,
        purchase_vat: raw.purchase_vat ?? 0,
      } as never)
      .subscribe({
        next: () => {
          this.notifications.success('Inventory costing submitted.');
          this.submitting.set(false);
          this.load();
          this.activeStep.set(1);
        },
        error: (err) => {
          this.submitting.set(false);
          this.notifications.error(getApiErrorMessage(err, 'Unable to submit costing.'));
        },
      });
  }

  submitPricing(): void {
    const workflow = this.workflow();
    if (!workflow || this.pricingForm.invalid || !this.canPreparePricing()) return;
    this.submitting.set(true);
    this.finance
      .prepareInventoryPricing(workflow.id, this.pricingForm.getRawValue() as never)
      .subscribe({
        next: () => {
          this.notifications.success('Pricing version prepared.');
          this.submitting.set(false);
          this.load();
          this.activeStep.set(2);
        },
        error: (err) => {
          this.submitting.set(false);
          this.notifications.error(getApiErrorMessage(err, 'Unable to prepare pricing.'));
        },
      });
  }

  approveWorkflow(): void {
    const workflow = this.workflow();
    if (!workflow || !this.canApproveRelease()) return;
    this.submitting.set(true);
    this.finance
      .approveInventoryWorkflow(workflow.id, this.approvalForm.getRawValue().reason)
      .subscribe({
        next: () => {
          this.notifications.success('Inventory released to READY_FOR_SALE.');
          this.submitting.set(false);
          this.load();
        },
        error: (err) => {
          this.submitting.set(false);
          this.notifications.error(getApiErrorMessage(err, 'Unable to approve workflow.'));
        },
      });
  }

  canProcessFinanceActions(): boolean {
    return canProcessInventoryWorkflows(this.auth);
  }

  canApproveFinanceActions(): boolean {
    return canApproveInventoryWorkflows(this.auth);
  }

  costingControlInvalid(name: CostingFieldName | 'cost_method'): boolean {
    const control = this.costingForm.controls[name];
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  pricingControlInvalid(name: PricingFieldName | 'pricing_method'): boolean {
    const control = this.pricingForm.controls[name];
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  costValue(name: CostingFieldName): number {
    const snapshot = this.costingSnapshot();
    return Number(snapshot[name] || 0);
  }

  pricingValue(name: PricingFieldName): number {
    const snapshot = this.pricingSnapshot();
    return Number(snapshot[name] || 0);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  prettyStatus(value: string | null | undefined): string {
    return (value || '—').replaceAll('_', ' ');
  }

  stepCardTone(step: WizardStep): string {
    if (this.activeStep() === step) {
      return 'border-[#1B3A6B] bg-[#1B3A6B]/5 shadow-sm';
    }
    return 'border-slate-200 bg-white hover:border-slate-300';
  }

  stepBadgeTone(step: WizardStep): string {
    if (this.activeStep() === step) {
      return 'bg-[#1B3A6B] text-white';
    }
    return 'bg-slate-100 text-slate-700';
  }

  progressTone(done: boolean): string {
    return done
      ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
      : 'border-slate-200 bg-white text-slate-600';
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
        return 'bg-slate-100 text-slate-700';
    }
  }

  toggleCapitalizeVat(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.finance.updateInventoryCostingSettings(checked).subscribe({
      next: () => {
        this.notifications.success('Inventory costing VAT policy updated.');
        this.load();
      },
      error: (err) => this.notifications.error(getApiErrorMessage(err, 'Unable to update costing policy.')),
    });
  }

  private patchForms(workflow: InventoryFinanceWorkflow, latestPrice: InventoryPriceVersion | null): void {
    this.costingForm.reset({
      cost_method: workflow.workflow_status === 'RECEIVED' ? null : workflow.cost_method,
      purchase_cost: this.nullableMoney(workflow.purchase_cost),
      purchase_vat: this.nullableOptionalMoney(workflow.purchase_vat),
      freight: this.nullableOptionalMoney(workflow.freight),
      insurance: this.nullableOptionalMoney(workflow.insurance),
      import_duty: this.nullableOptionalMoney(workflow.import_duty),
      clearing_charges: this.nullableOptionalMoney(workflow.clearing_charges),
      transportation: this.nullableOptionalMoney(workflow.transportation),
      handling_charges: this.nullableOptionalMoney(workflow.handling_charges),
      other_landed_costs: this.nullableOptionalMoney(workflow.other_landed_costs),
    });

    this.pricingForm.reset({
      pricing_method: latestPrice?.pricing_method ?? null,
      selling_unit_price: this.nullableMoney(latestPrice?.selling_unit_price),
      wholesale_price: this.nullableOptionalMoney(latestPrice?.wholesale_price),
      retail_price: this.nullableOptionalMoney(latestPrice?.retail_price),
      dealer_price: this.nullableOptionalMoney(latestPrice?.dealer_price),
      customer_price: this.nullableOptionalMoney(latestPrice?.customer_price),
      promotional_price: this.nullableOptionalMoney(latestPrice?.promotional_price),
      markup_percent: this.nullableOptionalMoney(latestPrice?.markup_percent),
      margin_percent: this.nullableOptionalMoney(latestPrice?.margin_percent),
      notes: latestPrice?.notes ?? '',
    });

    this.approvalForm.reset({
      reason: workflow.approval_reason || '',
    });
  }

  private nullableMoney(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    return Number(value);
  }

  private nullableOptionalMoney(value: unknown): number | null {
    const amount = this.nullableMoney(value);
    return amount && amount > 0 ? amount : null;
  }
}
