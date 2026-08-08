import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { forkJoin } from 'rxjs';

import { finalize } from 'rxjs/operators';



import { Item } from '../../../../core/models/inventory.model';

import {

  Department,

  PaymentMode,

  PaymentTerms,

  PRItem,

  PRLineType,

  PRPriority,

  PRRequestType,

  PRStatus,

} from '../../../../core/models/procurement.model';

import { AuthService } from '../../../../core/services/auth.service';

import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';

import { DepartmentsService } from '../../../../core/services/departments.service';

import { InventoryService } from '../../../../core/services/inventory.service';

import { NotificationService } from '../../../../core/services/notification.service';

import { ProcurementService } from '../../../../core/services/procurement.service';

import { getApiErrorMessage } from '../../../../core/utils/api.util';

import { formatCurrency } from '../../../../core/utils/format.util';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';

import { PAYMENT_MODES, PAYMENT_TERMS, PR_PRIORITIES, PR_REQUEST_TYPES } from '../../constants/procurement.constants';



const LINE_TYPE_OPTIONS: Array<{ value: PRLineType; label: string }> = [

  { value: 'INVENTORY', label: 'Inventory item' },

  { value: 'MANUAL', label: 'Manual entry' },

];



@Component({

  selector: 'app-requisition-form',

  imports: [

    FormsModule,

    ReactiveFormsModule,

    RouterLink,

    PageHeaderComponent,

    ProcurementNavComponent,

    SearchableSelectComponent,

  ],

  templateUrl: './requisition-form.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class RequisitionFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly procurement = inject(ProcurementService);

  private readonly inventory = inject(InventoryService);

  private readonly departments = inject(DepartmentsService);

  private readonly auth = inject(AuthService);

  private readonly notification = inject(NotificationService);

  private readonly confirm = inject(ConfirmDialogService);



  readonly items = signal<Item[]>([]);

  readonly warehouses = signal<{ id: number; name: string }[]>([]);

  readonly deptList = signal<Department[]>([]);

  readonly saving = signal(false);

  readonly editId = signal<number | null>(null);

  readonly prStatus = signal<PRStatus | null>(null);

  readonly rejectionReason = signal('');

  readonly priorities = PR_PRIORITIES;

  readonly requestTypes = PR_REQUEST_TYPES;

  readonly paymentTerms = PAYMENT_TERMS;

  readonly paymentModes = PAYMENT_MODES;

  readonly lineTypeOptions = LINE_TYPE_OPTIONS;

  readonly formatCurrency = formatCurrency;



  readonly form = this.fb.group({

    department: [null as number | null, Validators.required],

    request_type: ['STOCK_REPLENISHMENT' as PRRequestType, Validators.required],

    warehouse: [null as number | null],

    required_date: [''],

    reason: [''],

    priority: ['MEDIUM' as PRPriority, Validators.required],

    payment_terms: ['NET_30' as PaymentTerms],

    payment_mode: ['POSTPAID' as PaymentMode],

    advance_percent: [0],

    notes: [''],

    lineItems: this.fb.array([]),

  });

  showAdvancePercent(): boolean {
    return this.form.controls.payment_mode.value === 'PARTIAL';
  }



  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');

    forkJoin({

      items: this.inventory.getAllItems({ is_active: true }),

      depts: this.departments.getDepartments(),

      warehouses: this.inventory.getWarehouses({ page_size: 100, is_active: true }),

    }).subscribe(({ items, depts, warehouses }) => {

      this.items.set(items);

      this.deptList.set(depts);

      this.warehouses.set(warehouses.map((w) => ({ id: w.id, name: w.name })));

      const user = this.auth.getCurrentUser();

      if (user?.department && !id) {

        this.form.patchValue({ department: user.department });

      }

      if (id) {

        this.editId.set(+id);

        this.loadPr(+id);

      } else {

        this.addLine();

      }

    });

  }



  lineItems(): FormArray {

    return this.form.get('lineItems') as FormArray;

  }



  itemOptions(): SelectOption[] {

    return this.items().map((i) => ({

      value: i.id,

      label: `${i.code} — ${i.name}`,

      code: i.code,

      name: i.name,

    }));

  }



  isInventoryLine(i: number): boolean {
    return (this.lineItems().at(i).value.line_type as PRLineType) !== 'MANUAL';
  }

  lineUnit(i: number): string {
    const row = this.lineItems().at(i).value;
    const fromForm = String(row.unit_of_measure ?? '').trim();
    if (fromForm) return fromForm;
    const itemId = typeof row.item === 'number' ? row.item : null;
    const item = this.items().find((x) => x.id === itemId);
    return item?.unit_of_measure || 'unit';
  }

  loadPr(id: number): void {

    this.procurement.getRequisition(id).subscribe({

      next: (pr) => {

        if (!pr.can_edit) {

          this.notification.error('This requisition cannot be edited.');

          void this.router.navigate(['/procurement/requisitions']);

          return;

        }

        this.prStatus.set(pr.status);

        this.rejectionReason.set((pr.rejection_reason || '').trim());

        this.form.patchValue({

          department: pr.department,

          request_type: pr.request_type ?? 'STOCK_REPLENISHMENT',

          warehouse: pr.warehouse ?? null,

          required_date: pr.required_date ?? '',

          reason: pr.reason ?? '',

          priority: pr.priority,

          payment_terms: pr.payment_terms ?? 'NET_30',

          payment_mode: pr.payment_mode ?? 'POSTPAID',

          advance_percent: Number(pr.advance_percent ?? 0),

          notes: pr.notes,

        });

        this.lineItems().clear();

        pr.items.forEach((line) => this.lineItems().push(this.createLine(line)));

      },

      error: (e) => this.notification.error(getApiErrorMessage(e)),

    });

  }



  createLine(line?: PRItem) {
    const lineType: PRLineType =
      line?.line_type ?? (line?.item ? 'INVENTORY' : line?.description ? 'MANUAL' : 'INVENTORY');
    const taxRate = Number(line?.tax_rate ?? 18);
    return this.fb.group({
      line_type: [lineType, Validators.required],
      item: [line?.item ?? null],
      description: [line?.description ?? (lineType === 'MANUAL' ? line?.item_name ?? '' : '')],
      unit_of_measure: [line?.unit_of_measure ?? ''],
      quantity_requested: [line?.quantity_requested ?? 1, [Validators.required, Validators.min(0.0001)]],
      unit_cost_estimate: [line?.unit_cost_estimate ?? 0, Validators.required],
      tax_rate: [taxRate],
      vat_enabled: [taxRate > 0],
      notes: [line?.notes ?? ''],
    });
  }



  addLine(): void {

    this.lineItems().push(this.createLine());

  }



  removeLine(i: number): void {

    this.lineItems().removeAt(i);

  }



  onLineTypeChange(i: number, lineType: PRLineType): void {

    const group = this.lineItems().at(i);

    group.patchValue({

      line_type: lineType,

      item: null,

      description: '',

      unit_of_measure: '',

    });

  }



  onItemSelect(i: number, value: number | string | null): void {
    const id = typeof value === 'number' ? value : null;
    this.lineItems().at(i).patchValue({ item: id });
    const item = this.items().find((x) => x.id === id);
    if (item) {
      this.lineItems().at(i).patchValue({
        unit_cost_estimate: item.unit_cost,
        unit_of_measure: item.unit_of_measure,
      });
    }
  }

  onVatToggle(i: number, checked: boolean): void {
    this.lineItems().at(i).patchValue({ vat_enabled: checked, tax_rate: checked ? 18 : 0 });
  }

  lineNetTotal(i: number): number {
    const row = this.lineItems().at(i).value;
    return Number(row.quantity_requested ?? 0) * Number(row.unit_cost_estimate ?? 0);
  }

  lineVatAmount(i: number): number {
    return this.lineNetTotal(i) * (Number(this.lineItems().at(i).value.tax_rate ?? 0) / 100);
  }

  lineTotal(i: number): number {
    return this.lineNetTotal(i) + this.lineVatAmount(i);
  }

  runningNetTotal(): number {
    return this.lineItems().controls.reduce((sum, _, i) => sum + this.lineNetTotal(i), 0);
  }

  runningVatTotal(): number {
    return this.lineItems().controls.reduce((sum, _, i) => sum + this.lineVatAmount(i), 0);
  }

  runningTotal(): number {
    return this.lineItems().controls.reduce((sum, _, i) => sum + this.lineTotal(i), 0);
  }



  saveDraft(): void {

    this.save(false);

  }



  saveChanges(): void {

    this.save(false);

  }



  submitForApproval(): void {

    this.confirm.open({

      title: 'Submit for Approval',

      message: 'Submit this requisition for approval?',

      confirmLabel: 'Submit',

    }).subscribe((ok) => {

      if (ok) this.save(true);

    });

  }



  private save(submit: boolean): void {

    const lineErrors = this.validateLines();

    if (lineErrors) {

      this.notification.error(lineErrors);

      return;

    }

    if (this.form.invalid || this.lineItems().length < 1) {

      this.form.markAllAsTouched();

      this.notification.error('Add at least one item and complete required fields.');

      return;

    }

    const raw = this.form.getRawValue();

    const partial = raw.payment_mode === 'PARTIAL';
    const advancePercent = partial ? Number(raw.advance_percent ?? 0) : 0;
    if (partial && (!advancePercent || advancePercent <= 0 || advancePercent > 100)) {
      this.notification.error('Enter an advance percentage between 1 and 100 for partial payment.');
      return;
    }

    const payload = {

      department: raw.department!,

      request_type: raw.request_type!,

      warehouse: raw.warehouse,

      required_date: raw.required_date || null,

      reason: raw.reason ?? '',

      priority: raw.priority!,

      payment_terms: raw.payment_terms ?? 'NET_30',

      payment_mode: raw.payment_mode ?? 'POSTPAID',

      advance_percent: advancePercent,

      notes: raw.notes ?? '',

      items: (raw.lineItems as Array<{
        line_type: PRLineType;
        item: number | null;
        description: string;
        unit_of_measure: string;
        quantity_requested: number;
        unit_cost_estimate: number;
        tax_rate: number;
        notes: string;
      }>).map((l) => ({
        line_type: l.line_type,
        item: l.line_type === 'INVENTORY' ? l.item : null,
        description: l.line_type === 'MANUAL' ? l.description.trim() : '',
        unit_of_measure: l.unit_of_measure?.trim() ?? '',
        quantity_requested: Number(l.quantity_requested),
        unit_cost_estimate: Number(l.unit_cost_estimate),
        tax_rate: Number(l.tax_rate ?? 0),
        notes: l.notes ?? '',
      })),
    };

    this.saving.set(true);

    const id = this.editId();

    const req$ = id

      ? this.procurement.updateRequisition(id, payload)

      : this.procurement.createRequisition(payload);

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({

      next: (pr) => {

        const afterSubmit = () => {

          const msg = submit ? 'Requisition submitted' : 'Draft saved';

          this.notification.success(msg);

          void this.router.navigate(['/procurement/requisitions']);

        };

        if (submit) {

          this.procurement.submitRequisition(pr.id).subscribe({

            next: afterSubmit,

            error: (e) => this.notification.error(getApiErrorMessage(e)),

          });

        } else {

          afterSubmit();

        }

      },

      error: (e) => this.notification.error(getApiErrorMessage(e)),

    });

  }



  private validateLines(): string | null {

    for (let i = 0; i < this.lineItems().length; i++) {

      const line = this.lineItems().at(i).value as {

        line_type: PRLineType;

        item: number | null;

        description: string;

      };

      if (line.line_type === 'MANUAL') {

        if (!line.description?.trim()) {

          return `Line ${i + 1}: enter a description for the manual item.`;

        }

      } else if (!line.item) {

        return `Line ${i + 1}: select an inventory item or switch to manual entry.`;

      }

    }

    return null;

  }

}

