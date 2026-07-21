import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import {
  DeductionType,
  EmployeeDeduction,
  EmployeeDeductionFormData,
  EmployeeFormData,
  EmploymentType,
  Gender,
  PaymentFrequency,
  UnlinkedSystemUser,
  WorkingCompanyScope,
} from '../../../../core/models/hr.model';
import { Currency } from '../../../../core/models/inventory.model';
import { Department } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CompaniesService, CompanyOption } from '../../../../core/services/companies.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { HrNavComponent } from '../../components/hr-nav/hr-nav.component';
import {
  DEDUCTION_TYPES,
  DEPARTMENT_WORKING_SCOPE,
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  formatHrAmount,
  GENDERS,
  PAYMENT_FREQUENCIES,
  STATUTORY_EXEMPT_EMPLOYMENT_TYPES,
  WORKING_COMPANY_SCOPES,
} from '../../constants/hr.constants';
import { canManageEmployees } from '../../utils/hr-permissions.util';

type FormTab =
  | 'personal'
  | 'employment'
  | 'compensation'
  | 'tax'
  | 'deductions'
  | 'banking'
  | 'emergency';

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
  private readonly companies = inject(CompaniesService);
  private readonly notification = inject(NotificationService);

  readonly deptOptions = signal<Department[]>([]);
  readonly currencyOptions = signal<Currency[]>([]);
  readonly companyOptions = signal<CompanyOption[]>([]);
  readonly managers = signal<{ id: number; full_name: string }[]>([]);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);
  readonly activeTab = signal<FormTab>('personal');
  readonly linkExistingUser = signal(false);
  readonly unlinkedUsers = signal<UnlinkedSystemUser[]>([]);
  readonly loadingUnlinkedUsers = signal(false);
  readonly selectedLinkUserId = signal<number | null>(null);
  readonly userSearch = signal('');

  readonly genders = GENDERS;
  readonly employmentTypes = EMPLOYMENT_TYPES;
  readonly deductionTypes = DEDUCTION_TYPES;
  readonly paymentFrequencies = PAYMENT_FREQUENCIES;
  readonly employeeStatuses = EMPLOYEE_STATUSES;
  readonly workingCompanyScopes = WORKING_COMPANY_SCOPES;
  readonly formatHrAmount = formatHrAmount;
  readonly canManage = () => canManageEmployees(this.auth);

  readonly existingDeductions = signal<EmployeeDeduction[]>([]);
  readonly loadingDeductions = signal(false);
  readonly cancellingDeductionId = signal<number | null>(null);

  readonly tabs: { id: FormTab; label: string }[] = [
    { id: 'personal', label: 'Personal' },
    { id: 'employment', label: 'Employment' },
    { id: 'compensation', label: 'Compensation' },
    { id: 'tax', label: 'Tax' },
    { id: 'deductions', label: 'Deductions' },
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
    working_company_scope: ['SUPPLY' as WorkingCompanyScope, Validators.required],
    primary_working_company: [null as number | null, Validators.required],
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
    nssf_applicable: [true],
    nhif_applicable: [true],
    deductions: this.fb.array([]),
    bank_name: [''],
    bank_account: [''],
    bank_account_name: [''],
    bank_branch: [''],
    emergency_contact_name: [''],
    emergency_contact_relationship: [''],
    emergency_contact_phone: [''],
    emergency_contact_address: [''],
    status: ['DRAFT' as 'DRAFT' | 'ACTIVE' | 'INACTIVE'],
  });

  get allowances(): FormArray {
    return this.form.get('allowances') as FormArray;
  }

  get deductionRows(): FormArray {
    return this.form.get('deductions') as FormArray;
  }

  addDeduction(): void {
    this.deductionRows.push(
      this.fb.group({
        deduction_type: ['OFFICE_LOAN' as DeductionType, Validators.required],
        name: ['', Validators.required],
        principal_amount: [0, [Validators.required, Validators.min(1)]],
        monthly_installment: [0, [Validators.required, Validators.min(1)]],
        start_date: [new Date().toISOString().slice(0, 10)],
        notes: [''],
      }),
    );
  }

  removeDeduction(index: number): void {
    this.deductionRows.removeAt(index);
  }

  onEmploymentTypeChange(value: string): void {
    // Local labor / security guards default to statutory exemption; other types
    // default back to fully statutory. HR can still override on the Tax tab.
    const exempt = STATUTORY_EXEMPT_EMPLOYMENT_TYPES.includes(value);
    this.form.patchValue({
      paye_applicable: !exempt,
      nssf_applicable: !exempt,
      nhif_applicable: !exempt,
    });
  }

  loadDeductions(employeeId: number): void {
    this.loadingDeductions.set(true);
    this.hr
      .getEmployeeDeductions(employeeId)
      .pipe(finalize(() => this.loadingDeductions.set(false)))
      .subscribe({
        next: (page) => this.existingDeductions.set(page.results),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  cancelDeduction(deduction: EmployeeDeduction): void {
    this.cancellingDeductionId.set(deduction.id);
    this.hr
      .cancelDeduction(deduction.id)
      .pipe(finalize(() => this.cancellingDeductionId.set(null)))
      .subscribe({
        next: () => {
          this.notification.success('Deduction cancelled');
          const id = this.editId();
          if (id) this.loadDeductions(id);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({
      departments: this.departments.getDepartments(),
      currencies: this.currencies.getCurrencies(),
      companies: this.companies.listCompanies(),
      employees: this.hr.getEmployees({ page_size: 100, status: 'ACTIVE' }),
    }).subscribe(({ departments, currencies, companies, employees }) => {
      this.deptOptions.set(departments);
      this.currencyOptions.set(currencies);
      this.companyOptions.set(companies);
      this.managers.set(
        employees.results.map((e) => ({ id: e.id, full_name: e.full_name })),
      );
      const tzs = currencies.find((c) => c.code === 'TZS');
      if (tzs && !this.editId()) {
        this.form.patchValue({ currency: tzs.id });
      }
      const supply = companies.find((c) => c.code === 'SUPPLY');
      if (supply && !this.editId()) {
        this.form.patchValue({ primary_working_company: supply.id });
      }
      this.form.get('department')?.valueChanges.subscribe((deptId) => {
        if (deptId) this.onDepartmentChanged(deptId);
      });
      if (id) {
        this.editId.set(+id);
        this.loadEmployee(+id);
      } else {
        this.loadUnlinkedUsers();
      }
    });
  }

  filteredUnlinkedUsers(): UnlinkedSystemUser[] {
    const q = this.userSearch().trim().toLowerCase();
    const users = this.unlinkedUsers();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role_name ?? '').toLowerCase().includes(q) ||
        (u.department_name ?? '').toLowerCase().includes(q),
    );
  }

  loadUnlinkedUsers(): void {
    this.loadingUnlinkedUsers.set(true);
    this.hr
      .getUsersWithoutEmployees()
      .pipe(finalize(() => this.loadingUnlinkedUsers.set(false)))
      .subscribe({
        next: (users) => this.unlinkedUsers.set(users),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  toggleLinkExistingUser(enabled: boolean): void {
    this.linkExistingUser.set(enabled);
    if (!enabled) {
      this.selectedLinkUserId.set(null);
      return;
    }
    if (!this.unlinkedUsers().length) {
      this.loadUnlinkedUsers();
    }
  }

  onLinkUserSelected(userId: number | null): void {
    this.selectedLinkUserId.set(userId);
    if (!userId) return;

    const user = this.unlinkedUsers().find((u) => u.id === userId);
    if (!user) return;

    const patch: Record<string, unknown> = {
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || '',
      personal_email: user.email,
    };
    if (user.role_name) {
      patch['job_title'] = user.role_name;
    }
    if (user.department) {
      patch['department'] = user.department;
    }
    this.form.patchValue(patch);
    if (user.department) {
      this.onDepartmentChanged(user.department);
    }
    if (!this.form.get('primary_working_company')?.value) {
      const options = this.primaryCompanyOptions();
      if (options[0]) {
        this.form.patchValue({ primary_working_company: options[0].id });
      }
    }
    if (!this.form.get('currency')?.value) {
      const tzs = this.currencyOptions().find((c) => c.code === 'TZS');
      if (tzs) {
        this.form.patchValue({ currency: tzs.id });
      }
    }
  }

  primaryCompanyOptions(): CompanyOption[] {
    const scope = this.form.get('working_company_scope')?.value;
    const companies = this.companyOptions();
    if (scope === 'STEIN') return companies.filter((c) => c.code === 'STEIN');
    if (scope === 'SUPPLY') return companies.filter((c) => c.code === 'SUPPLY');
    return companies;
  }

  onScopeChange(): void {
    const options = this.primaryCompanyOptions();
    const current = this.form.get('primary_working_company')?.value;
    if (!options.some((c) => c.id === current)) {
      this.form.patchValue({ primary_working_company: options[0]?.id ?? null });
    }
  }

  private onDepartmentChanged(deptId: number): void {
    const dept = this.deptOptions().find((d) => d.id === deptId);
    if (!dept) return;
    const scope = (DEPARTMENT_WORKING_SCOPE[dept.name] ?? 'SUPPLY') as WorkingCompanyScope;
    this.form.patchValue({ working_company_scope: scope });
    this.onScopeChange();
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
          working_company_scope: emp.working_company_scope,
          primary_working_company: emp.primary_working_company,
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
          nssf_applicable: emp.nssf_applicable ?? true,
          nhif_applicable: emp.nhif_applicable ?? true,
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
        this.loadDeductions(id);
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

  tabHasErrors(tab: FormTab): boolean {
    return this.getMissingRequiredFields()
      .filter((f) => f.tab === tab)
      .some((f) => f.invalid);
  }

  private readonly requiredFieldMeta: { key: string; tab: FormTab; label: string }[] = [
    { key: 'first_name', tab: 'personal', label: 'First name' },
    { key: 'last_name', tab: 'personal', label: 'Last name' },
    { key: 'gender', tab: 'personal', label: 'Gender' },
    { key: 'department', tab: 'employment', label: 'Department' },
    { key: 'working_company_scope', tab: 'employment', label: 'Working company' },
    { key: 'primary_working_company', tab: 'employment', label: 'Primary working company' },
    { key: 'job_title', tab: 'employment', label: 'Job title' },
    { key: 'employment_type', tab: 'employment', label: 'Employment type' },
    { key: 'basic_salary', tab: 'compensation', label: 'Basic salary' },
    { key: 'currency', tab: 'compensation', label: 'Currency' },
    { key: 'payment_frequency', tab: 'compensation', label: 'Payment frequency' },
  ];

  private getMissingRequiredFields(): { tab: FormTab; label: string; invalid: boolean }[] {
    const missing: { tab: FormTab; label: string; invalid: boolean }[] = [];
    for (const field of this.requiredFieldMeta) {
      const ctrl = this.form.get(field.key);
      if (ctrl?.invalid) {
        missing.push({ tab: field.tab, label: field.label, invalid: true });
      }
    }
    this.allowances.controls.forEach((group, index) => {
      if (group.invalid) {
        missing.push({
          tab: 'compensation',
          label: `Allowance row ${index + 1}`,
          invalid: true,
        });
      }
    });
    this.deductionRows.controls.forEach((group, index) => {
      if (group.invalid) {
        missing.push({
          tab: 'deductions',
          label: `Deduction row ${index + 1}`,
          invalid: true,
        });
      }
    });
    return missing;
  }

  private focusFirstInvalidTab(): void {
    const missing = this.getMissingRequiredFields();
    if (missing.length) {
      this.activeTab.set(missing[0].tab);
    }
  }

  save(): void {
    if (this.linkExistingUser() && !this.selectedLinkUserId() && !this.editId()) {
      this.notification.error('Select a system user to link, or turn off the link option.');
      this.activeTab.set('personal');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const missing = this.getMissingRequiredFields();
      this.focusFirstInvalidTab();
      if (missing.length) {
        const labels = [...new Set(missing.map((m) => m.label))];
        this.notification.error(`Complete required fields: ${labels.join(', ')}`);
      } else {
        this.notification.error('Complete all required fields.');
      }
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
      working_company_scope: raw.working_company_scope as WorkingCompanyScope,
      primary_working_company: raw.primary_working_company!,
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
      nssf_applicable: raw.nssf_applicable ?? true,
      nhif_applicable: raw.nhif_applicable ?? true,
      bank_name: raw.bank_name ?? '',
      bank_account: raw.bank_account ?? '',
      bank_account_name: raw.bank_account_name ?? '',
      bank_branch: raw.bank_branch ?? '',
      emergency_contact_name: raw.emergency_contact_name ?? '',
      emergency_contact_relationship: raw.emergency_contact_relationship ?? '',
      emergency_contact_phone: raw.emergency_contact_phone ?? '',
      emergency_contact_address: raw.emergency_contact_address ?? '',
      status: raw.status as EmployeeFormData['status'],
      allowances: allowanceRows.map((a) => ({
        name: a.name,
        amount: String(a.amount),
        is_taxable: a.is_taxable,
      })),
    };

    const id = this.editId();
    const linkUserId = this.selectedLinkUserId();
    if (!id && linkUserId) {
      payload.link_user_id = linkUserId;
    }

    const newDeductions = (this.deductionRows.getRawValue() ?? []) as {
      deduction_type: DeductionType;
      name: string;
      principal_amount: number;
      monthly_installment: number;
      start_date: string;
      notes: string;
    }[];

    this.saving.set(true);
    const req$ = id
      ? this.hr.updateEmployee(id, payload)
      : this.hr.createEmployee(payload);

    req$
      .pipe(
        switchMap((emp) => {
          if (!newDeductions.length) {
            return of(emp);
          }
          const requests = newDeductions.map((d) =>
            this.hr.createDeduction({
              employee: emp.id,
              deduction_type: d.deduction_type,
              name: d.name,
              principal_amount: String(d.principal_amount),
              monthly_installment: String(d.monthly_installment),
              start_date: d.start_date || undefined,
              notes: d.notes || undefined,
            }),
          );
          return forkJoin(requests).pipe(switchMap(() => of(emp)));
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (emp) => {
          this.notification.success(id ? 'Employee updated' : 'Employee registered');
          void this.router.navigate(['/hr/employees', emp.id, 'view']);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
