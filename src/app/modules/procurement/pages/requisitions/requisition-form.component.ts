import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Item } from '../../../../core/models/inventory.model';
import { Department, PRItem, PRPriority } from '../../../../core/models/procurement.model';
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
import { PR_PRIORITIES } from '../../constants/procurement.constants';

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
  readonly deptList = signal<Department[]>([]);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);
  readonly priorities = PR_PRIORITIES;
  readonly formatCurrency = formatCurrency;

  readonly form = this.fb.group({
    department: [null as number | null, Validators.required],
    priority: ['MEDIUM' as PRPriority, Validators.required],
    notes: [''],
    lineItems: this.fb.array([]),
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({
      items: this.inventory.getItems({ page_size: 200, is_active: true }),
      depts: this.departments.getDepartments(),
    }).subscribe(({ items, depts }) => {
      this.items.set(items.results);
      this.deptList.set(depts);
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
    }));
  }

  loadPr(id: number): void {
    this.procurement.getRequisition(id).subscribe({
      next: (pr) => {
        this.form.patchValue({
          department: pr.department,
          priority: pr.priority,
          notes: pr.notes,
        });
        this.lineItems().clear();
        pr.items.forEach((line) => this.lineItems().push(this.createLine(line)));
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  createLine(line?: PRItem) {
    return this.fb.group({
      item: [line?.item ?? null, Validators.required],
      quantity_requested: [line?.quantity_requested ?? 1, [Validators.required, Validators.min(0.0001)]],
      unit_cost_estimate: [line?.unit_cost_estimate ?? 0, Validators.required],
      notes: [line?.notes ?? ''],
    });
  }

  addLine(): void {
    this.lineItems().push(this.createLine());
  }

  removeLine(i: number): void {
    this.lineItems().removeAt(i);
  }

  onItemSelect(i: number, value: number | string | null): void {
    const id = typeof value === 'number' ? value : null;
    this.lineItems().at(i).patchValue({ item: id });
    const item = this.items().find((x) => x.id === id);
    if (item) {
      this.lineItems().at(i).patchValue({ unit_cost_estimate: item.unit_cost });
    }
  }

  lineTotal(i: number): number {
    const row = this.lineItems().at(i).value;
    return Number(row.quantity_requested ?? 0) * Number(row.unit_cost_estimate ?? 0);
  }

  runningTotal(): number {
    return this.lineItems().controls.reduce((sum, _, i) => sum + this.lineTotal(i), 0);
  }

  saveDraft(): void {
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
    if (this.form.invalid || this.lineItems().length < 1) {
      this.form.markAllAsTouched();
      this.notification.error('Add at least one item and complete required fields.');
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      department: raw.department!,
      priority: raw.priority!,
      notes: raw.notes ?? '',
      items: (raw.lineItems as Array<{
        item: number | null;
        quantity_requested: number;
        unit_cost_estimate: number;
        notes: string;
      }>).map((l) => ({
        item: l.item!,
        quantity_requested: Number(l.quantity_requested),
        unit_cost_estimate: Number(l.unit_cost_estimate),
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
          this.notification.success(submit ? 'Requisition submitted' : 'Draft saved');
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
}
