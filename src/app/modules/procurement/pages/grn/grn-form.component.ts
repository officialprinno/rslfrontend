import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Warehouse } from '../../../../core/models/inventory.model';
import { GoodsReceivedNote, GRNCondition, PaymentMode, PurchaseOrder } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyContextService } from '../../../../core/services/company-context.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
import { formatNumber } from '../../../../core/utils/format.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';
import { isStorekeeperVisible } from '../../../inventory/utils/inventory-permissions.util';
import { grnHintForPaymentMode } from '../../utils/payment-readiness.util';

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
  private readonly companyContext = inject(CompanyContextService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pos = signal<PurchaseOrder[]>([]);
  readonly warehouses = signal<Warehouse[]>([]);
  readonly selectedPo = signal<PurchaseOrder | null>(null);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);
  readonly receivedByName = signal('');
  readonly poWarehouseName = signal<string | null>(null);
  /** Bumps whenever reactive form values change so receiptTotals recomputes. */
  private readonly formRevision = signal(0);

  readonly isStorekeeperView = () => isStorekeeperVisible(this.auth, this.companyContext);
  readonly locationLabel = () => (this.isStorekeeperView() ? 'Main Store' : 'Warehouse');
  readonly backRoute = () =>
    this.isStorekeeperView() ? '/inventory/grn' : '/procurement/grn';

  readonly grnPaymentHint = (mode: PaymentMode) => grnHintForPaymentMode(mode);
  readonly formatNumber = formatNumber;

  readonly receiptTotals = computed(() => {
    this.formRevision();
    const lines = this.lineItems().controls.map((control) => control.value as {
      quantity_received?: number;
      quantity_damaged?: number;
      quantity_missing?: number;
    });
    let good = 0;
    let damaged = 0;
    let missing = 0;
    let activeLines = 0;
    for (const line of lines) {
      const g = Number(line.quantity_received ?? 0);
      const d = Number(line.quantity_damaged ?? 0);
      const m = Number(line.quantity_missing ?? 0);
      if (g + d + m <= 0) continue;
      activeLines += 1;
      good += g;
      damaged += d;
      missing += m;
    }
    return {
      lineCount: activeLines,
      good,
      damaged,
      missing,
      accounted: good + damaged + missing,
      physical: good + damaged,
    };
  });

  readonly form = this.fb.group({
    purchase_order: [null as number | null, Validators.required],
    warehouse: [null as number | null, Validators.required],
    received_date: [new Date().toISOString().slice(0, 10), Validators.required],
    notes: [''],
    is_final_delivery: [false],
    discrepancy_notes: [''],
    lineItems: this.fb.array([]),
  });

  ngOnInit(): void {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.formRevision.update((n) => n + 1);
    });

    const user = this.auth.getCurrentUser();
    this.receivedByName.set(user ? `${user.first_name} ${user.last_name}` : '');
    const id = this.route.snapshot.paramMap.get('id');
    const poParam = this.route.snapshot.queryParamMap.get('po');

    forkJoin({
      pos: this.procurement.getReceivablePurchaseOrders(100),
      warehouses: this.inventory.getWarehouses({ is_active: true }),
    }).subscribe(({ pos, warehouses }) => {
      this.pos.set(pos);
      this.warehouses.set(warehouses);
      if (id && id !== 'new') {
        this.editId.set(+id);
        this.loadGrn(+id);
      } else if (poParam) {
        this.form.patchValue({ purchase_order: +poParam });
        this.onPoChange(+poParam);
      } else {
        this.applyFallbackWarehouse(warehouses);
      }
    });
  }

  warehouseLabel(warehouse: Warehouse): string {
    if (this.isStorekeeperView()) {
      return warehouse.name === 'Main Warehouse' ? 'Main Store' : warehouse.name;
    }
    return warehouse.name;
  }

  private applyFallbackWarehouse(warehouses: Warehouse[]): void {
    if (this.editId() || this.form.value.warehouse) {
      return;
    }
    const preferred = this.isStorekeeperView()
      ? warehouses.find((w) => w.name === 'Main Store' || w.name === 'Main Warehouse')
      : warehouses[0];
    if (preferred) {
      this.form.patchValue({ warehouse: preferred.id });
    }
  }

  private applyWarehouseFromPo(po: PurchaseOrder): void {
    const warehouseId = po.warehouse_id ?? null;
    this.poWarehouseName.set(po.warehouse_name ?? null);
    if (warehouseId && this.warehouses().some((w) => w.id === warehouseId)) {
      this.form.patchValue({ warehouse: warehouseId });
      return;
    }
    this.applyFallbackWarehouse(this.warehouses());
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
          is_final_delivery: grn.is_final_delivery ?? false,
          discrepancy_notes: grn.discrepancy_notes ?? '',
        });
        this.lineItems().clear();
        grn.items.forEach((line) =>
          this.lineItems().push(
            this.fb.group({
              po_item: [line.po_item],
              item: [line.item],
              item_name: [line.item_name],
              unit_of_measure: [line.unit_of_measure ?? 'unit'],
              quantity_ordered: [line.quantity_ordered],
              quantity_previously_received: [line.quantity_previously_received],
              quantity_received: [line.quantity_received],
              quantity_damaged: [line.quantity_damaged ?? 0],
              quantity_missing: [line.quantity_missing ?? 0],
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
        this.formRevision.update((n) => n + 1);
        this.procurement.getPurchaseOrder(grn.purchase_order).subscribe({
          next: (po) => {
            this.selectedPo.set(po);
            this.poWarehouseName.set(po.warehouse_name ?? null);
          },
        });
      },
    });
  }

  onPoChange(poId: number): void {
    if (!poId) {
      this.selectedPo.set(null);
      this.poWarehouseName.set(null);
      this.lineItems().clear();
      this.formRevision.update((n) => n + 1);
      return;
    }
    this.procurement.getPurchaseOrder(poId).subscribe({
      next: (po) => {
        this.selectedPo.set(po);
        this.pos.update((list) => list.map((entry) => (entry.id === po.id ? po : entry)));
        this.applyWarehouseFromPo(po);
        this.buildLineItems(po);
      },
    });
  }

  needsSerialColumn(): boolean {
    return this.lineItems().controls.some((line) => line.value.has_serial_number);
  }

  needsExpiryColumn(): boolean {
    return this.lineItems().controls.some((line) => line.value.has_expiry_date);
  }

  lineRemaining(index: number): number {
    const line = this.lineItems().at(index).value;
    return Math.max(
      0,
      Number(line.quantity_ordered) - Number(line.quantity_previously_received ?? 0),
    );
  }

  lineGood(index: number): number {
    return Math.max(0, Number(this.lineItems().at(index).value.quantity_received ?? 0));
  }

  lineDamaged(index: number): number {
    return Math.max(0, Number(this.lineItems().at(index).value.quantity_damaged ?? 0));
  }

  lineMissing(index: number): number {
    return Math.max(0, Number(this.lineItems().at(index).value.quantity_missing ?? 0));
  }

  lineHasDamageOrMissing(index: number): boolean {
    return this.lineAccounted(index) > 0 && (this.lineDamaged(index) > 0 || this.lineMissing(index) > 0);
  }

  lineAccounted(index: number): number {
    return this.lineGood(index) + this.lineDamaged(index) + this.lineMissing(index);
  }

  /**
   * Keep Good + Damaged + Missing within remaining.
   * Entering damaged/missing reduces Good first (defaults fill Good with remaining).
   */
  onReceiptQtyChange(index: number, changed: 'good' | 'damaged' | 'missing'): void {
    const group = this.lineItems().at(index);
    const remaining = this.lineRemaining(index);
    let good = Math.max(0, Number(group.get('quantity_received')?.value ?? 0));
    let damaged = Math.max(0, Number(group.get('quantity_damaged')?.value ?? 0));
    let missing = Math.max(0, Number(group.get('quantity_missing')?.value ?? 0));

    if (changed === 'damaged') {
      const maxDamaged = Math.max(0, remaining - missing);
      if (damaged > maxDamaged) {
        damaged = maxDamaged;
      }
      const overflow = good + damaged + missing - remaining;
      if (overflow > 0) {
        good = Math.max(0, good - overflow);
      }
    } else if (changed === 'missing') {
      const maxMissing = Math.max(0, remaining - damaged);
      if (missing > maxMissing) {
        missing = maxMissing;
      }
      const overflow = good + damaged + missing - remaining;
      if (overflow > 0) {
        good = Math.max(0, good - overflow);
      }
    } else {
      const maxGood = Math.max(0, remaining - damaged - missing);
      if (good > maxGood) {
        good = maxGood;
      }
    }

    group.patchValue(
      {
        quantity_received: good,
        quantity_damaged: damaged,
        quantity_missing: missing,
      },
      { emitEvent: true },
    );
  }

  lineOutstandingAfter(index: number): number {
    const line = this.lineItems().at(index).value;
    // Outstanding on PO after this receipt: remaining minus all accounted qty
    return Math.max(0, this.lineRemaining(index) - this.lineAccounted(index));
  }

  allLinesFullyReceived(): boolean {
    const lines = this.lineItems().controls;
    return lines.length > 0 && lines.every((_, i) => this.lineRemaining(i) <= 0);
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
          unit_of_measure: [item.unit_of_measure ?? 'unit'],
          quantity_ordered: [item.quantity_ordered],
          quantity_previously_received: [item.quantity_received ?? 0],
          quantity_received: [remaining > 0 ? remaining : 0],
          quantity_damaged: [0],
          quantity_missing: [0],
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
    this.formRevision.update((n) => n + 1);
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
    const po = this.selectedPo();
    if (po && !po.can_receive_goods && !this.editId()) {
      this.notification.error(
        'GRN is blocked until supplier order tracking shows Delivered. Update status in Order Tracking first.',
      );
      return;
    }
    const raw = this.form.getRawValue();
    const lineRows = raw.lineItems as Array<{
      item_name: string;
      quantity_ordered: number;
      quantity_previously_received: number;
      quantity_received: number;
      quantity_damaged?: number;
      quantity_missing?: number;
      serial_number?: string;
      expiry_date?: string;
      has_serial_number?: boolean;
      has_expiry_date?: boolean;
    }>;
    let hasActivity = false;
    for (let i = 0; i < lineRows.length; i++) {
      const line = lineRows[i];
      const good = Number(line.quantity_received ?? 0);
      const damaged = Number(line.quantity_damaged ?? 0);
      const missing = Number(line.quantity_missing ?? 0);
      const accounted = good + damaged + missing;
      if (accounted <= 0) continue;
      hasActivity = true;
      const remaining = this.lineRemaining(i);
      if (accounted > remaining) {
        this.notification.error(
          `Cannot account for ${accounted} on ${line.item_name}; only ${remaining} remaining on this PO line.`,
        );
        return;
      }
      const physical = good + damaged;
      if (line.has_serial_number && physical > 0 && !line.serial_number?.trim()) {
        this.notification.error(`Serial number is required for ${line.item_name}.`);
        return;
      }
      if (line.has_expiry_date && physical > 0 && !line.expiry_date) {
        this.notification.error(`Expiry date is required for ${line.item_name}.`);
        return;
      }
    }
    if (!hasActivity) {
      this.notification.error('Enter good, damaged, or missing quantity on at least one line.');
      return;
    }
    const payload = {
      purchase_order: raw.purchase_order!,
      warehouse: raw.warehouse!,
      received_date: raw.received_date!,
      notes: raw.notes ?? '',
      is_final_delivery: !!raw.is_final_delivery,
      discrepancy_notes: raw.discrepancy_notes ?? '',
      items: (raw.lineItems as Array<{
        po_item: number;
        item: number;
        quantity_received: number;
        quantity_damaged: number;
        quantity_missing: number;
        unit_cost: number;
        serial_number: string;
        expiry_date: string;
        condition: GRNCondition;
        notes: string;
      }>)
        .filter((l) => {
          const accounted =
            Number(l.quantity_received ?? 0)
            + Number(l.quantity_damaged ?? 0)
            + Number(l.quantity_missing ?? 0);
          return accounted > 0;
        })
        .map((l) => ({
          po_item: l.po_item,
          item: l.item,
          quantity_received: Number(l.quantity_received ?? 0),
          quantity_damaged: Number(l.quantity_damaged ?? 0),
          quantity_missing: Number(l.quantity_missing ?? 0),
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
              const summary = result.stock_updates
                .map((u) => `${u.item}: +${u.quantity}${u.condition ? ` (${u.condition})` : ''}`)
                .join(', ');
              this.notification.success(`GRN confirmed. Stock updated: ${summary}`);
              void this.router.navigate([this.backRoute()]);
            },
          });
        } else {
          this.notification.success('GRN draft saved');
          void this.router.navigate([this.backRoute()]);
        }
      },
    });
  }
}
