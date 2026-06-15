import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { UserOption } from '../../../../core/models/inventory.model';
import { MaterialRequirement, Machine, Product, Shift, WOFormData } from '../../../../core/models/production.model';
import { SalesOrder } from '../../../../core/models/sales.model';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductionService } from '../../../../core/services/production.service';
import { SalesService } from '../../../../core/services/sales.service';
import { UsersService } from '../../../../core/services/users.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ProductionNavComponent } from '../../components/production-nav/production-nav.component';
import { MATERIAL_STATUS_COLOR, SHIFTS } from '../../constants/production.constants';

@Component({
  selector: 'app-wo-form',
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, ProductionNavComponent],
  templateUrl: './wo-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly production = inject(ProductionService);
  private readonly sales = inject(SalesService);
  private readonly users = inject(UsersService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly products = signal<Product[]>([]);
  readonly machines = signal<Machine[]>([]);
  readonly salesOrders = signal<SalesOrder[]>([]);
  readonly operators = signal<UserOption[]>([]);
  readonly materialReqs = signal<MaterialRequirement[]>([]);
  readonly loadingMaterials = signal(false);
  readonly selectedProduct = signal<Product | null>(null);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);

  readonly shifts = SHIFTS;
  readonly materialStatusColor = MATERIAL_STATUS_COLOR;

  readonly hasMaterialShortage = computed(() =>
    this.materialReqs().some((m) => !m.is_sufficient),
  );

  readonly form = this.fb.group({
    product: [null as number | null, Validators.required],
    sales_order: [null as number | null],
    machine: [null as number | null],
    quantity_planned: [1, [Validators.required, Validators.min(1)]],
    planned_start: ['', Validators.required],
    planned_end: ['', Validators.required],
    shift: ['MORNING' as Shift, Validators.required],
    operator: [null as number | null, Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({
      products: this.production.getProducts({ page_size: 100, is_active: true }),
      machines: this.production.getMachines({ page_size: 100, is_active: true, status: 'ACTIVE' }),
      salesOrders: this.sales.getSalesOrders({ status: 'CONFIRMED', page_size: 100 }),
      operators: this.users.getUsers(),
    }).subscribe(({ products, machines, salesOrders, operators }) => {
      this.products.set(products.results);
      this.machines.set(machines.results);
      this.salesOrders.set(salesOrders.results);
      this.operators.set(operators);
      if (id) {
        this.editId.set(+id);
        this.loadWorkOrder(+id);
      }
    });

    this.form.get('product')?.valueChanges.subscribe((productId) => {
      if (productId) this.onProductSelect(productId);
    });
    this.form.get('quantity_planned')?.valueChanges.subscribe(() => this.refreshMaterials());
  }

  loadWorkOrder(id: number): void {
    this.production.getWorkOrder(id).subscribe({
      next: (wo) => {
        this.form.patchValue({
          product: wo.product,
          sales_order: wo.sales_order,
          machine: wo.machine,
          quantity_planned: wo.quantity_planned,
          planned_start: wo.planned_start?.slice(0, 16) ?? '',
          planned_end: wo.planned_end?.slice(0, 16) ?? '',
          shift: wo.shift,
          operator: wo.operator,
          notes: wo.notes ?? '',
        });
        this.materialReqs.set(wo.material_requirements ?? []);
        const product = this.products().find((p) => p.id === wo.product) ?? null;
        this.selectedProduct.set(product);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  onProductSelect(productId: number): void {
    const product = this.products().find((p) => p.id === productId) ?? null;
    this.selectedProduct.set(product);
    this.refreshMaterials();
  }

  refreshMaterials(): void {
    const product = this.selectedProduct();
    const qty = Number(this.form.get('quantity_planned')?.value ?? 0);
    if (!product?.active_bom_id || qty < 1) {
      this.materialReqs.set([]);
      return;
    }
    this.loadingMaterials.set(true);
    this.production
      .checkMaterialAvailability(product.active_bom_id, qty)
      .pipe(finalize(() => this.loadingMaterials.set(false)))
      .subscribe({
        next: (reqs) => this.materialReqs.set(reqs),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  saveDraft(): void {
    this.save(false);
  }

  submitForApproval(): void {
    if (this.hasMaterialShortage()) {
      this.confirm
        .open({
          title: 'Material Shortage',
          message: 'Some materials are insufficient. Submit anyway?',
          confirmLabel: 'Submit',
        })
        .subscribe((ok) => {
          if (ok) this.save(true);
        });
      return;
    }
    this.confirm
      .open({
        title: 'Submit Work Order',
        message: 'Submit this work order for approval?',
        confirmLabel: 'Submit',
      })
      .subscribe((ok) => {
        if (ok) this.save(true);
      });
  }

  private save(submit: boolean): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.form.getRawValue();
    const product = this.selectedProduct();
    const payload: WOFormData = {
      product: raw.product!,
      bom: product?.active_bom_id ?? undefined,
      sales_order: raw.sales_order,
      machine: raw.machine,
      quantity_planned: Number(raw.quantity_planned),
      planned_start: raw.planned_start!,
      planned_end: raw.planned_end!,
      shift: raw.shift!,
      operator: raw.operator!,
      notes: raw.notes ?? '',
    };

    this.saving.set(true);
    const id = this.editId();
    const req$ = id
      ? this.production.updateWorkOrder(id, payload)
      : this.production.createWorkOrder(payload);

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (wo) => {
        const done = () => {
          this.notification.success(submit ? 'Work order submitted' : 'Draft saved');
          void this.router.navigate(['/production/work-orders', wo.id, 'view']);
        };
        if (submit) {
          this.production.submitWorkOrder(wo.id).subscribe({
            next: done,
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
        } else {
          done();
        }
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
