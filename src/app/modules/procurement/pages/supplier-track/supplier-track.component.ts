import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  SupplierPortalLineItem,
  SupplierPortalTracking,
  SupplierTrackingStatus,
} from '../../../../core/models/inventory.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';

@Component({
  selector: 'app-supplier-track',
  imports: [ReactiveFormsModule],
  templateUrl: './supplier-track.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierTrackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly inventory = inject(InventoryService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly tracking = signal<SupplierPortalTracking | null>(null);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly submitted = signal(false);

  readonly formatDate = formatDate;

  readonly statusOptions: { value: SupplierTrackingStatus; label: string }[] = [
    { value: 'ACKNOWLEDGED', label: 'Acknowledge order' },
    { value: 'MANUFACTURING', label: 'Manufacturing' },
    { value: 'PRODUCTION', label: 'Production' },
    { value: 'DISPATCHED', label: 'Dispatched / Shipped' },
    { value: 'IN_TRANSIT', label: 'In transit' },
    { value: 'DELAYED', label: 'Delayed' },
  ];

  readonly form = this.fb.group({
    status: ['' as SupplierTrackingStatus | '', Validators.required],
    dispatch_date: [''],
    eta_date: [''],
    quantity_dispatched: [null as number | null],
    carrier: [''],
    tracking_number: [''],
    supplier_notes: [''],
    item_quantities: this.fb.array<FormGroup>([]),
  });

  private token = '';

  get itemQuantities(): FormArray<FormGroup> {
    return this.form.controls.item_quantities;
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.error.set('Invalid tracking link.');
      this.loading.set(false);
      return;
    }
    this.load();
  }

  hasMultipleItems(): boolean {
    return (this.tracking()?.items.length ?? 0) > 1;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.inventory
      .getSupplierTrackingByToken(this.token)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.tracking.set(data);
          this.syncItemQuantities(data.items);
          this.form.patchValue({
            status: this.portalFormStatus(data.tracking_status),
            dispatch_date: data.dispatch_date ?? '',
            eta_date: data.eta_date ?? '',
            quantity_dispatched: this.singleItemQuantity(data),
            carrier: data.carrier,
            tracking_number: data.tracking_number,
            supplier_notes: data.supplier_notes,
          });
        },
        error: (e) =>
          this.error.set(
            getApiErrorMessage(e, 'Order tracking not found or link has expired.'),
          ),
      });
  }

  submit(): void {
    if (this.submitting() || this.submitted()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Please select an order status.');
      return;
    }

    this.submitting.set(true);
    const v = this.form.getRawValue();
    const payload = {
      status: (v.status || 'ACKNOWLEDGED') as SupplierTrackingStatus,
      dispatch_date: v.dispatch_date || null,
      eta_date: v.eta_date || null,
      carrier: v.carrier ?? '',
      tracking_number: v.tracking_number ?? '',
      supplier_notes: v.supplier_notes ?? '',
      ...(this.hasMultipleItems()
        ? { items: this.buildItemPayload() }
        : { quantity_dispatched: v.quantity_dispatched }),
    };

    this.inventory
      .respondSupplierTracking(this.token, payload)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (data) => {
          this.tracking.set(data);
          this.submitted.set(true);
          this.notification.success('Order status update recorded. Thank you!');
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  /** AWAITING is internal-only — map to empty so supplier picks an actionable status. */
  private portalFormStatus(status: SupplierTrackingStatus): SupplierTrackingStatus | '' {
    if (status === 'AWAITING') return '';
    return status;
  }

  private syncItemQuantities(items: SupplierPortalLineItem[]): void {
    this.itemQuantities.clear();
    for (const item of items) {
      this.itemQuantities.push(
        this.fb.group({
          po_item_id: [item.po_item_id],
          code: [item.code],
          name: [item.name],
          quantity_ordered: [item.quantity_ordered],
          uom: [item.uom],
          quantity_dispatched: [
            item.quantity_dispatched ? Number(item.quantity_dispatched) : null,
          ],
        }),
      );
    }
  }

  private singleItemQuantity(data: SupplierPortalTracking): number | null {
    if (data.items.length !== 1) {
      return data.quantity_dispatched ? Number(data.quantity_dispatched) : null;
    }
    const lineQty = data.items[0].quantity_dispatched;
    if (lineQty) return Number(lineQty);
    return data.quantity_dispatched ? Number(data.quantity_dispatched) : null;
  }

  private buildItemPayload(): { po_item_id: number; quantity_dispatched: number | null }[] {
    return this.itemQuantities.controls.map((group) => ({
      po_item_id: group.get('po_item_id')?.value as number,
      quantity_dispatched: group.get('quantity_dispatched')?.value as number | null,
    }));
  }
}
