import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Currency } from '../../../../core/models/inventory.model';
import { Customer, CustomerFormData, PaymentTerms } from '../../../../core/models/sales.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SalesService } from '../../../../core/services/sales.service';
import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { PaymentTermsBadgeComponent } from '../../../procurement/components/payment-terms-badge/payment-terms-badge.component';
import { SalesNavComponent } from '../../components/sales-nav/sales-nav.component';
import { COUNTRIES, MINE_TYPES, PAYMENT_TERMS } from '../../constants/sales.constants';
import { canDeleteAnything, canManageCustomers } from '../../utils/sales-permissions.util';

@Component({
  selector: 'app-customers',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SalesNavComponent,
    PaginationComponent,
    ModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
    PaymentTermsBadgeComponent,
  ],
  templateUrl: './customers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomersComponent implements OnInit {
  private readonly sales = inject(SalesService);
  private readonly currencyService = inject(CurrencyService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  readonly customers = signal<Customer[]>([]);
  readonly currencies = signal<Currency[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly search = signal('');
  readonly countryFilter = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly paymentTermsFilter = signal('');
  readonly showForm = signal(false);
  readonly editing = signal<Customer | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly countries = COUNTRIES;
  readonly paymentTerms = PAYMENT_TERMS;
  readonly mineTypes = MINE_TYPES;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;

  readonly canAdd = () => canManageCustomers(this.auth);
  readonly canDelete = () => canDeleteAnything(this.auth);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    registration_number: [''],
    tin_number: ['', Validators.required],
    vat_number: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    address: [''],
    city: [''],
    country: ['Tanzania', Validators.required],
    mine_name: ['', Validators.required],
    mine_location: [''],
    mine_type: ['UNDERGROUND' as CustomerFormData['mine_type'], Validators.required],
    contact_person: [''],
    contact_phone: [''],
    currency: [null as number | null, Validators.required],
    credit_limit: [0, Validators.required],
    payment_terms: ['NET_30' as PaymentTerms, Validators.required],
  });

  ngOnInit(): void {
    this.currencyService.getCurrencies().subscribe((c) => this.currencies.set(c));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number | boolean> = {
      page: this.page(),
      page_size: this.pageSize(),
      ordering: 'name',
    };
    if (this.search()) params['search'] = this.search();
    if (this.countryFilter()) params['country'] = this.countryFilter();
    if (this.paymentTermsFilter()) params['payment_terms'] = this.paymentTermsFilter();
    if (this.statusFilter() === 'active') params['is_active'] = true;
    if (this.statusFilter() === 'inactive') params['is_active'] = false;

    this.sales
      .getCustomers(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.customers.set(data.results);
          this.total.set(data.count);
        },
        error: () => this.error.set(true),
      });
  }

  openAdd(): void {
    this.editing.set(null);
    this.fieldErrors.set({});
    this.form.reset({
      name: '',
      registration_number: '',
      tin_number: '',
      vat_number: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'Tanzania',
      mine_name: '',
      mine_location: '',
      mine_type: 'UNDERGROUND',
      contact_person: '',
      contact_phone: '',
      currency: this.currencies()[0]?.id ?? null,
      credit_limit: 0,
      payment_terms: 'NET_30',
    });
    this.showForm.set(true);
  }

  openEdit(c: Customer): void {
    this.editing.set(c);
    this.fieldErrors.set({});
    this.form.patchValue({
      name: c.name,
      registration_number: c.registration_number,
      tin_number: c.tin_number,
      vat_number: c.vat_number,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      country: c.country,
      mine_name: c.mine_name,
      mine_location: c.mine_location,
      mine_type: c.mine_type,
      contact_person: c.contact_person,
      contact_phone: c.contact_phone,
      currency: c.currency,
      credit_limit: c.credit_limit,
      payment_terms: c.payment_terms,
    });
    this.showForm.set(true);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Please complete all required fields.');
      return;
    }
    const raw = this.form.getRawValue();
    const data: CustomerFormData = {
      name: (raw.name ?? '').trim(),
      registration_number: raw.registration_number ?? '',
      tin_number: (raw.tin_number ?? '').trim(),
      vat_number: raw.vat_number ?? '',
      email: (raw.email ?? '').trim(),
      phone: (raw.phone ?? '').trim(),
      address: raw.address ?? '',
      city: raw.city ?? '',
      country: raw.country ?? 'Tanzania',
      mine_name: (raw.mine_name ?? '').trim(),
      mine_location: raw.mine_location ?? '',
      mine_type: raw.mine_type ?? 'UNDERGROUND',
      contact_person: raw.contact_person ?? '',
      contact_phone: raw.contact_phone ?? '',
      currency: raw.currency!,
      credit_limit: Number(raw.credit_limit),
      payment_terms: raw.payment_terms ?? 'NET_30',
    };
    this.saving.set(true);
    const edit = this.editing();
    const req$ = edit
      ? this.sales.updateCustomer(edit.id, data)
      : this.sales.createCustomer(data);
    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notification.success(edit ? 'Customer updated' : 'Customer created');
        this.showForm.set(false);
        this.load();
      },
      error: (err) => {
        const httpErr = err as { error?: { errors?: unknown } };
        if (httpErr.error?.errors) this.fieldErrors.set(extractFieldErrors(httpErr.error.errors as never));
        this.notification.error(getApiErrorMessage(err, 'Failed to save customer'));
      },
    });
  }

  onDelete(c: Customer): void {
    this.confirm
      .open({
        title: 'Delete Customer',
        message: `Deactivate "${c.name}"?`,
        confirmLabel: 'Delete',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.sales.deleteCustomer(c.id).subscribe({
          next: () => {
            this.notification.success('Customer deactivated');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e, 'Delete failed')),
        });
      });
  }

  exportExcel(): void {
    exportToExcel('customers', [
      { key: 'name', label: 'Name' },
      { key: 'tin_number', label: 'TIN' },
      { key: 'mine_name', label: 'Mine Name' },
      { key: 'mine_location', label: 'Mine Location' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'currency_code', label: 'Currency' },
      { key: 'credit_limit', label: 'Credit Limit' },
      { key: 'credit_balance', label: 'Credit Balance' },
      { key: 'payment_terms', label: 'Payment Terms' },
    ], this.customers());
  }
}
