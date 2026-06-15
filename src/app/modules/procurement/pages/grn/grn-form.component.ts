import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Warehouse } from '../../../../core/models/inventory.model';
import { GoodsReceivedNote, GRNCondition, PurchaseOrder } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';

@Component({
  selector: 'app-grn-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    ProcurementNavComponent,
  ],
  templateUrl: './grn-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrnFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly procurement = inject(ProcurementService);
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly pos = signal<PurchaseOrder[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly selectedPo = signal<PurchaseOrder | null>(null);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);
  readonly receivedByName = signal('');

  readonly form = this.fb.group({
    purchase_order: [null as number | null, Validators.required],
    warehouse: [null as number | null, Validators.required],
    received_date: [new Date().toISOString().slice(0, 10), Validators.required],
    notes: [''],
    lineItems: this.fb.array([]),
  });

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.receivedByName.set(user ? `${user.first_name} ${user.last_name}` : '');
    const id = this.route.snapshot.paramMap.get('id');
    const poParam = this.route.snapshot.queryParamMap.get('po');

    forkJoin({
      pos: this.procurement.getPurchaseOrders({ status: 'APPROVED', page_size: 100 }),
      sent: this.procurement.getPurchaseOrders({ status: 'SENT', page_size: 100 }),
      partial: this.procurement.getPurchaseOrders({ status: 'PARTIAL', page_size: 100 }),
      warehouses: this.inventory.getWarehouses({ is_active: true }),
    }).subscribe(({ pos, sent, partial, warehouses }) => {
      const all = [...pos.results, ...sent.results, ...partial.results];
      this.pos.set(all);
      this.warehouses.set(warehouses);
      if (id && id !== 'new') {
        this.editId.set(+id);
        this.loadGrn(+id);
      } else if (poParam) {
        this.form.patchValue({ purchase_order: +poParam });
        this.onPoChange(+poParam);
      }
    });
  }

  lineItems(): FormArray {
    return this.form.get('lineItems') as FormArray;
  }

  loadGrn(id: number): void {
    this.procurement.getGRN(id).subscribe({
      next: (grn: GoodsReceivedNote) => {
        this.form.patchValue({
          purchase_order: grn.purchase_order,
          warehouse: grn.warehouse,
          received_date: grn.received_date,
          notes: grn.notes,
        });
        this.lineItems().clear();
        grn.items.forEach((line) =>
          this.lineItems().push(
            this.fb.group({
              po_item: [line.po_item],
              item: [line.item],
              item_name: [line.item_name],
              quantity_ordered: [line.quantity_ordered],
              quantity_previously_received: [line.quantity_previously_received],
              quantity_received: [line.quantity_received],
              unit_cost: [line.unit_cost],
              serial_number: [line.serial_number ?? ''],
              expiry_date: [line.expiry_date ?? ''],
              condition: [line.condition as GRNCondition],
              notes: [line.notes ?? ''],
              has_serial_number: [line.has_serial_number],
              has_expiry_date: [line.has_expiry_date],
            }),
          ),
        );
      },
    });
  }

  onPoChange(poId: number): void {
    if (!poId) {
      this.selectedPo.set(null);
      this.lineItems().clear();
      return;
    }
    this.procurement.getPurchaseOrder(poId).subscribe({
      next: (po) => {
        this.selectedPo.set(po);
        this.pos.update((list) => list.map((entry) => (entry.id === po.id ? po : entry)));
        this.buildLineItems(po);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  needsSerialColumn(): boolean {
    return this.lineItems().controls.some((line) => line.value.has_serial_number);
  }

  needsExpiryColumn(): boolean {
    return this.lineItems().controls.some((line) => line.value.has_expiry_date);
  }

  private buildLineItems(po: PurchaseOrder): void {
    this.lineItems().clear();
    po.items.forEach((item) => {
      const remaining = Number(item.quantity_ordered) - Number(item.quantity_received ?? 0);
      this.lineItems().push(
        this.fb.group({
          po_item: [item.id],
          item: [item.item],
          item_name: [`${item.item_code} — ${item.item_name}`],
          quantity_ordered: [item.quantity_ordered],
          quantity_previously_received: [item.quantity_received ?? 0],
          quantity_received: [remaining > 0 ? remaining : 0],
          unit_cost: [item.unit_price],
          serial_number: [''],
          expiry_date: [''],
          condition: ['GOOD' as GRNCondition],
          notes: [''],
          has_serial_number: [item.has_serial_number ?? false],
          has_expiry_date: [item.has_expiry_date ?? false],
        }),
      );
    });
  }

  saveDraft(): void {
    this.save(false);
  }

  confirmGrn(): void {
    this.confirm.open({
      title: 'Confirm GRN',
      message: 'This will update inventory stock and PO receipt status. Continue?',
      confirmLabel: 'Confirm GRN',
    }).subscribe((ok) => { if (ok) this.save(true); });
  }

  private save(confirm: boolean): void {
    if (this.form.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.form.getRawValue();
    for (const line of raw.lineItems as Array<{
      item_name: string;
      quantity_received: number;
      serial_number?: string;
      expiry_date?: string;
      has_serial_number?: boolean;
      has_expiry_date?: boolean;
    }>) {
      const qty = Number(line.quantity_received);
      if (qty <= 0) continue;
      if (line.has_serial_number && !line.serial_number?.trim()) {
        this.notification.error(`Serial number is required for ${line.item_name}.`);
        return;
      }
      if (line.has_expiry_date && !line.expiry_date) {
        this.notification.error(`Expiry date is required for ${line.item_name}.`);
        return;
      }
    }
    const payload = {
      purchase_order: raw.purchase_order!,
      warehouse: raw.warehouse!,
      received_date: raw.received_date!,
      notes: raw.notes ?? '',
      items: (raw.lineItems as Array<{
        po_item: number;
        item: number;
        quantity_received: number;
        unit_cost: number;
        serial_number: string;
        expiry_date: string;
        condition: GRNCondition;
        notes: string;
      }>).map((l) => ({
        po_item: l.po_item,
        item: l.item,
        quantity_received: Number(l.quantity_received),
        unit_cost: Number(l.unit_cost),
        serial_number: l.serial_number?.trim() || '',
        expiry_date: l.expiry_date || null,
        condition: l.condition,
        notes: l.notes ?? '',
      })),
    };
    this.saving.set(true);
    const id = this.editId();
    const req$ = id
      ? this.procurement.updateGRN(id, payload)
      : this.procurement.createGRN(payload);
    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (grn) => {
        if (confirm) {
          this.procurement.confirmGRN(grn.id).subscribe({
            next: (result) => {
              const summary = result.stock_updates.map((u) => `${u.item}: +${u.quantity}`).join(', ');
              this.notification.success(`GRN confirmed. Stock updated: ${summary}`);
              void this.router.navigate(['/procurement/grn']);
            },
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
        } else {
          this.notification.success('GRN draft saved');
          void this.router.navigate(['/procurement/grn']);
        }
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
