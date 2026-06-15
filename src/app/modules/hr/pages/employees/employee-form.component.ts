import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
  EmployeeFormData,
  EmploymentType,
  Gender,
  PaymentFrequency,
} from '../../../../core/models/hr.model';
import { Currency } from '../../../../core/models/inventory.model';
import { Department } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { HrNavComponent } from '../../components/hr-nav/hr-nav.component';
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  PAYMENT_FREQUENCIES,
} from '../../constants/hr.constants';
import { canManageEmployees } from '../../utils/hr-permissions.util';

type FormTab = 'personal' | 'employment' | 'compensation' | 'tax' | 'banking' | 'emergency';

@Component({
  selector: 'app-employee-form',
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, HrNavComponent],
  templateUrl: './employee-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hr = inject(HrService);
  private readonly auth = inject(AuthService);
  private readonly departments = inject(DepartmentsService);
  private readonly currencies = inject(CurrencyService);
  private readonly notification = inject(NotificationService);

  readonly deptOptions = signal<Department[]>([]);
  readonly currencyOptions = signal<Currency[]>([]);
  readonly managers = signal<{ id: number; full_name: string }[]>([]);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);
  readonly activeTab = signal<FormTab>('personal');

  readonly genders = GENDERS;
  readonly employmentTypes = EMPLOYMENT_TYPES;
  readonly paymentFrequencies = PAYMENT_FREQUENCIES;
  readonly employeeStatuses = EMPLOYEE_STATUSES;
  readonly canManage = () => canManageEmployees(this.auth);

  readonly tabs: { id: FormTab; label: string }[] = [
    { id: 'personal', label: 'Personal' },
    { id: 'employment', label: 'Employment' },
    { id: 'compensation', label: 'Compensation' },
    { id: 'tax', label: 'Tax' },
    { id: 'banking', label: 'Banking' },
    { id: 'emergency', label: 'Emergency' },
  ];

  readonly form = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    gender: ['MALE', Validators.required],
    date_of_birth: [''],
    national_id: [''],
    phone: [''],
    personal_email: [''],
    address: [''],
    city: [''],
    department: [null as number | null, Validators.required],
    job_title: ['', Validators.required],
    employment_type: ['PERMANENT', Validators.required],
    contract_start: [''],
    contract_end: [''],
    probation_end: [''],
    reports_to: [null as number | null],
    basic_salary: [0, [Validators.required, Validators.min(0)]],
    currency: [null as number | null, Validators.required],
    payment_frequency: ['MONTHLY', Validators.required],
    allowances: this.fb.array([]),
    tin_number: [''],
    nssf_number: [''],
    nhif_number: [''],
    paye_applicable: [true],
    bank_name: [''],
    bank_account: [''],
    bank_account_name: [''],
    bank_branch: [''],
    emergency_contact_name: [''],
    emergency_contact_relationship: [''],
    emergency_contact_phone: [''],
    emergency_contact_address: [''],
    create_user_account: [false],
    status: ['DRAFT' as 'DRAFT' | 'ACTIVE' | 'INACTIVE'],
  });

  get allowances(): FormArray {
    return this.form.get('allowances') as FormArray;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({
      departments: this.departments.getDepartments(),
      currencies: this.currencies.getCurrencies(),
      employees: this.hr.getEmployees({ page_size: 100, status: 'ACTIVE' }),
    }).subscribe(({ departments, currencies, employees }) => {
      this.deptOptions.set(departments);
      this.currencyOptions.set(currencies);
      this.managers.set(
        employees.results.map((e) => ({ id: e.id, full_name: e.full_name })),
      );
      const tzs = currencies.find((c) => c.code === 'TZS');
      if (tzs && !this.editId()) {
        this.form.patchValue({ currency: tzs.id });
      }
      if (id) {
        this.editId.set(+id);
        this.loadEmployee(+id);
      }
    });
  }

  loadEmployee(id: number): void {
    this.hr.getEmployee(id).subscribe({
      next: (emp) => {
        this.form.patchValue({
          first_name: emp.first_name,
          last_name: emp.last_name,
          gender: emp.gender,
          date_of_birth: emp.date_of_birth ?? '',
          national_id: emp.national_id,
          phone: emp.phone,
          personal_email: emp.personal_email,
          address: emp.address,
          city: emp.city,
          department: emp.department,
          job_title: emp.job_title,
          employment_type: emp.employment_type,
          contract_start: emp.contract_start ?? '',
          contract_end: emp.contract_end ?? '',
          probation_end: emp.probation_end ?? '',
          reports_to: emp.reports_to,
          basic_salary: Number(emp.basic_salary),
          currency: emp.currency,
          payment_frequency: emp.payment_frequency,
          tin_number: emp.tin_number,
          nssf_number: emp.nssf_number,
          nhif_number: emp.nhif_number,
          paye_applicable: emp.paye_applicable,
          bank_name: emp.bank_name,
          bank_account: emp.bank_account,
          bank_account_name: emp.bank_account_name,
          bank_branch: emp.bank_branch,
          emergency_contact_name: emp.emergency_contact_name,
          emergency_contact_relationship: emp.emergency_contact_relationship,
          emergency_contact_phone: emp.emergency_contact_phone,
          emergency_contact_address: emp.emergency_contact_address,
          status: emp.status,
        });
        this.allowances.clear();
        for (const a of emp.allowances ?? []) {
          this.allowances.push(
            this.fb.group({
              name: [a.name, Validators.required],
              amount: [Number(a.amount), [Validators.required, Validators.min(0)]],
              is_taxable: [a.is_taxable],
            }),
          );
        }
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  setTab(tab: FormTab): void {
    this.activeTab.set(tab);
  }

  addAllowance(): void {
    this.allowances.push(
      this.fb.group({
        name: ['', Validators.required],
        amount: [0, [Validators.required, Validators.min(0)]],
        is_taxable: [true],
      }),
    );
  }

  removeAllowance(index: number): void {
    this.allowances.removeAt(index);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.form.getRawValue();
    const allowanceRows = (raw.allowances ?? []) as {
      name: string;
      amount: number;
      is_taxable: boolean;
    }[];
    const payload: EmployeeFormData = {
      first_name: raw.first_name!,
      last_name: raw.last_name!,
      gender: raw.gender as Gender,
      date_of_birth: raw.date_of_birth || null,
      national_id: raw.national_id ?? '',
      phone: raw.phone ?? '',
      personal_email: raw.personal_email ?? '',
      address: raw.address ?? '',
      city: raw.city ?? '',
      department: raw.department!,
      job_title: raw.job_title!,
      employment_type: raw.employment_type as EmploymentType,
      contract_start: raw.contract_start || null,
      contract_end: raw.contract_end || null,
      probation_end: raw.probation_end || null,
      reports_to: raw.reports_to,
      basic_salary: String(raw.basic_salary),
      currency: raw.currency!,
      payment_frequency: raw.payment_frequency as PaymentFrequency,
      tin_number: raw.tin_number ?? '',
      nssf_number: raw.nssf_number ?? '',
      nhif_number: raw.nhif_number ?? '',
      paye_applicable: raw.paye_applicable ?? true,
      bank_name: raw.bank_name ?? '',
      bank_account: raw.bank_account ?? '',
      bank_account_name: raw.bank_account_name ?? '',
      bank_branch: raw.bank_branch ?? '',
      emergency_contact_name: raw.emergency_contact_name ?? '',
      emergency_contact_relationship: raw.emergency_contact_relationship ?? '',
      emergency_contact_phone: raw.emergency_contact_phone ?? '',
      emergency_contact_address: raw.emergency_contact_address ?? '',
      create_user_account: raw.create_user_account ?? false,
      status: raw.status as EmployeeFormData['status'],
      allowances: allowanceRows.map((a) => ({
        name: a.name,
        amount: String(a.amount),
        is_taxable: a.is_taxable,
      })),
    };

    this.saving.set(true);
    const id = this.editId();
    const req$ = id
      ? this.hr.updateEmployee(id, payload)
      : this.hr.createEmployee(payload);

    req$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (emp) => {
        this.notification.success(id ? 'Employee updated' : 'Employee created');
        void this.router.navigate(['/hr/employees', emp.id, 'view']);
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
