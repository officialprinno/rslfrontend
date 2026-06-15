import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Currency } from '../../../../core/models/inventory.model';
import { PaymentTerms, Supplier, SupplierFormData } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProcurementService } from '../../../../core/services/procurement.service';
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
import { PaymentTermsBadgeComponent } from '../../components/payment-terms-badge/payment-terms-badge.component';
import { ProcurementNavComponent } from '../../components/procurement-nav/procurement-nav.component';
import { StarRatingComponent } from '../../components/star-rating/star-rating.component';
import { COUNTRIES, PAYMENT_TERMS } from '../../constants/procurement.constants';
import { canDeleteAnything, canManageSuppliers } from '../../utils/procurement-permissions.util';

@Component({
  selector: 'app-suppliers',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    ProcurementNavComponent,
    PaginationComponent,
    ModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
    StarRatingComponent,
    PaymentTermsBadgeComponent,
  ],
  templateUrl: './suppliers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuppliersComponent implements OnInit {
  private readonly procurement = inject(ProcurementService);
  private readonly currencyService = inject(CurrencyService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  readonly suppliers = signal<Supplier[]>([]);
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
  readonly ratingFilter = signal<number | ''>('');
  readonly showForm = signal(false);
  readonly showView = signal(false);
  readonly editing = signal<Supplier | null>(null);
  readonly viewing = signal<Supplier | null>(null);
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly countries = COUNTRIES;
  readonly paymentTerms = PAYMENT_TERMS;
  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;

  readonly canAdd = () => canManageSuppliers(this.auth);
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
    currency: [null as number | null, Validators.required],
    payment_terms: ['NET_30' as PaymentTerms, Validators.required],
    rating: [3, Validators.required],
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
    if (this.ratingFilter()) params['rating'] = this.ratingFilter() as number;
    if (this.statusFilter() === 'active') params['is_active'] = true;
    if (this.statusFilter() === 'inactive') params['is_active'] = false;

    this.procurement
      .getSuppliers(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.suppliers.set(data.results);
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
      currency: this.currencies()[0]?.id ?? null,
      payment_terms: 'NET_30',
      rating: 3,
    });
    this.showForm.set(true);
  }

  openEdit(s: Supplier): void {
    this.editing.set(s);
    this.fieldErrors.set({});
    this.form.patchValue({
      name: s.name,
      registration_number: s.registration_number,
      tin_number: s.tin_number,
      vat_number: s.vat_number,
      email: s.email,
      phone: s.phone,
      address: s.address,
      city: s.city,
      country: s.country,
      currency: s.currency,
      payment_terms: s.payment_terms,
      rating: s.rating,
    });
    this.showForm.set(true);
  }

  openView(s: Supplier): void {
    this.procurement.getSupplier(s.id).subscribe({
      next: (full) => {
        this.viewing.set(full);
        this.showView.set(true);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to load supplier')),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Please complete all required fields.');
      return;
    }
    const raw = this.form.getRawValue();
    const data: SupplierFormData = {
      name: (raw.name ?? '').trim(),
      registration_number: raw.registration_number ?? '',
      tin_number: (raw.tin_number ?? '').trim(),
      vat_number: raw.vat_number ?? '',
      email: (raw.email ?? '').trim(),
      phone: (raw.phone ?? '').trim(),
      address: raw.address ?? '',
      city: raw.city ?? '',
      country: raw.country ?? 'Tanzania',
      currency: raw.currency!,
      payment_terms: raw.payment_terms ?? 'NET_30',
      rating: raw.rating ?? 3,
    };
    this.saving.set(true);
    const edit = this.editing();
    const req$ = edit
      ? this.procurement.updateSupplier(edit.id, data)
      : this.procurement.createSupplier(data);
    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notification.success(edit ? 'Supplier updated' : 'Supplier created');
        this.showForm.set(false);
        this.load();
      },
      error: (err) => {
        const httpErr = err as { error?: { errors?: unknown } };
        if (httpErr.error?.errors) this.fieldErrors.set(extractFieldErrors(httpErr.error.errors as never));
        this.notification.error(getApiErrorMessage(err, 'Failed to save supplier'));
      },
    });
  }

  onDelete(s: Supplier): void {
    this.confirm.open({
      title: 'Delete Supplier',
      message: `Deactivate "${s.name}"?`,
      confirmLabel: 'Delete',
      confirmDanger: true,
    }).subscribe((ok) => {
      if (!ok) return;
      this.procurement.deleteSupplier(s.id).subscribe({
        next: () => {
          this.notification.success('Supplier deactivated');
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Delete failed')),
      });
    });
  }

  exportExcel(): void {
    exportToExcel('suppliers', [
      { key: 'name', label: 'Name' },
      { key: 'tin_number', label: 'TIN' },
      { key: 'email', label: 'Email' },
      { key: 'country', label: 'Country' },
      { key: 'currency_code', label: 'Currency' },
      { key: 'rating', label: 'Rating' },
    ], this.suppliers());
  }

  setRating(r: number): void {
    this.form.controls.rating.setValue(r);
  }
}
