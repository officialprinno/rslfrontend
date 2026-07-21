import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Item } from '../../../../core/models/inventory.model';
import {
  Customer,
  CustomerItemPrice,
  CustomerItemPriceFormData,
} from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CompanyContextService } from '../../../../core/services/company-context.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { EnterpriseDataTableComponent } from '../../../../shared/components/enterprise-data-table/enterprise-data-table.component';
import { ListFilterBarComponent } from '../../../../shared/components/list-filter-bar/list-filter-bar.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TableActionsComponent, TableAction } from '../../../../shared/components/table-actions/table-actions.component';
import { TableCellTextComponent } from '../../../../shared/components/table-cell-text/table-cell-text.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { canManageCustomers } from '../../utils/sales-permissions.util';

@Component({
  selector: 'app-customer-prices',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    SalesNavComponent,
    PaginationComponent,
    ModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    EnterpriseDataTableComponent,
    ListFilterBarComponent,
    TableActionsComponent,
    TableCellTextComponent,
  ],
  templateUrl: './customer-prices.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerPricesComponent implements OnInit {
  private readonly sales = inject(SalesService);
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly companyContext = inject(CompanyContextService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  readonly prices = signal<CustomerItemPrice[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly items = signal<Item[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly exporting = signal(false);
  readonly importing = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly search = signal('');
  readonly customerFilter = signal<number | null>(null);
  readonly showForm = signal(false);
  readonly editing = signal<CustomerItemPrice | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});
  readonly importErrors = signal<string[]>([]);
  readonly showImportErrors = signal(false);

  readonly formatCurrency = formatCurrency;
  readonly canManage = () => canManageCustomers(this.auth);

  readonly selectedItem = computed(() => {
    const itemId = this.form.controls.item.value;
    return this.items().find((i) => i.id === itemId) ?? null;
  });

  readonly form = this.fb.group({
    customer: [null as number | null, Validators.required],
    item: [null as number | null, Validators.required],
    unit_price: [null as number | null, [Validators.required, Validators.min(0.01)]],
    notes: [''],
  });

  ngOnInit(): void {
    this.loadLookups();
    this.load();
  }

  loadLookups(): void {
    this.sales.getCustomers({ page_size: 500, is_active: true, ordering: 'name' }).subscribe({
      next: (data) => this.customers.set(data.results),
    });
    this.inventory.getSalesLineItems().subscribe({
      next: (items) => this.items.set(items),
      error: () => {
        this.inventory.getItems({ page_size: 500, is_active: true }).subscribe({
          next: (data) => this.items.set(data.results),
        });
      },
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number | boolean> = {
      page: this.page(),
      page_size: this.pageSize(),
      ordering: 'customer__name',
    };
    if (this.search()) params['search'] = this.search();
    if (this.customerFilter()) params['customer'] = this.customerFilter()!;

    this.sales
      .getCustomerPrices(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.prices.set(data.results);
          this.total.set(data.count);
        },
        error: () => this.error.set(true),
      });
  }

  openAdd(): void {
    this.editing.set(null);
    this.fieldErrors.set({});
    this.form.reset({
      customer: this.customerFilter(),
      item: null,
      unit_price: null,
      notes: '',
    });
    this.form.controls.customer.enable();
    this.form.controls.item.enable();
    this.showForm.set(true);
  }

  openEdit(row: CustomerItemPrice): void {
    this.editing.set(row);
    this.fieldErrors.set({});
    this.form.patchValue({
      customer: row.customer,
      item: row.item,
      unit_price: Number(row.unit_price),
      notes: row.notes ?? '',
    });
    this.form.controls.customer.disable();
    this.form.controls.item.disable();
    this.showForm.set(true);
  }

  onItemSelected(): void {
    if (this.editing()) return;
    const item = this.selectedItem();
    if (!item) return;
    const price = item.approved_selling_price ?? item.selling_price;
    if (price != null && this.form.controls.unit_price.value == null) {
      this.form.patchValue({ unit_price: Number(price) });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Please complete all required fields.');
      return;
    }
    if (!this.companyContext.headerValue() || this.companyContext.isConsolidated()) {
      this.notification.error(
        'Select Rock Solutions Stein or Supply in the header before saving a customer price.',
      );
      return;
    }

    const raw = this.form.getRawValue();
    const data: CustomerItemPriceFormData = {
      customer: raw.customer!,
      item: raw.item!,
      unit_price: Number(raw.unit_price),
      notes: (raw.notes ?? '').trim(),
    };

    this.saving.set(true);
    const edit = this.editing();
    const req$ = edit
      ? this.sales.updateCustomerPrice(edit.id, {
          unit_price: data.unit_price,
          notes: data.notes,
        })
      : this.sales.createCustomerPrice(data);

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notification.success(edit ? 'Customer price updated' : 'Customer price saved');
        this.showForm.set(false);
        this.load();
      },
      error: (err) => {
        const httpErr = err as { error?: { errors?: unknown } };
        if (httpErr.error?.errors) {
          this.fieldErrors.set(extractFieldErrors(httpErr.error.errors as never));
        }
        this.notification.error(getApiErrorMessage(err, 'Failed to save customer price'));
      },
    });
  }

  onDelete(row: CustomerItemPrice): void {
    this.confirm
      .open({
        title: 'Remove Customer Price',
        message: `Remove price for "${row.item_code}" on ${row.customer_name}?`,
        confirmLabel: 'Remove',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.sales.deleteCustomerPrice(row.id).subscribe({
          next: () => {
            this.notification.success('Customer price removed');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e, 'Remove failed')),
        });
      });
  }

  rowActions(row: CustomerItemPrice): TableAction[] {
    const actions: TableAction[] = [];
    if (this.canManage()) {
      actions.push({ id: 'edit', label: 'Edit', icon: 'edit' });
      actions.push({ id: 'delete', label: 'Remove', icon: 'delete', danger: true });
    }
    return actions;
  }

  onRowAction(actionId: string, row: CustomerItemPrice): void {
    if (actionId === 'edit') this.openEdit(row);
    if (actionId === 'delete') this.onDelete(row);
  }

  itemLabel(item: Item): string {
    return `${item.code} — ${item.name}`;
  }

  downloadCsv(): void {
    if (!this.companyContext.headerValue() || this.companyContext.isConsolidated()) {
      this.notification.error(
        'Select Rock Solutions Stein or Supply in the header before downloading CSV.',
      );
      return;
    }
    this.exporting.set(true);
    const customerId = this.customerFilter();
    this.sales
      .downloadCustomerPricesCsv(customerId)
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (blob) => {
          const customer = this.customers().find((c) => c.id === customerId);
          const name = customer
            ? `customer-prices-${customer.name.replace(/\s+/g, '-').toLowerCase()}.csv`
            : 'customer-prices.csv';
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = name;
          link.click();
          URL.revokeObjectURL(url);
          this.notification.success(
            customerId
              ? 'CSV template downloaded. Fill customer_price and upload again.'
              : 'Customer prices CSV downloaded.',
          );
        },
        error: (e) => this.notification.error(getApiErrorMessage(e, 'CSV download failed')),
      });
  }

  onUploadClick(input: HTMLInputElement): void {
    if (!this.companyContext.headerValue() || this.companyContext.isConsolidated()) {
      this.notification.error(
        'Select Rock Solutions Stein or Supply in the header before uploading CSV.',
      );
      return;
    }
    input.click();
  }

  onCsvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.notification.error('Please upload a .csv file.');
      return;
    }

    this.importing.set(true);
    this.importErrors.set([]);
    this.showImportErrors.set(false);
    this.sales
      .importCustomerPricesCsv(file)
      .pipe(finalize(() => this.importing.set(false)))
      .subscribe({
        next: ({ data, message }) => {
          this.notification.success(message || 'CSV imported');
          if (data.errors?.length) {
            this.importErrors.set(data.errors);
            this.showImportErrors.set(true);
          }
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e, 'CSV import failed')),
      });
  }
}
