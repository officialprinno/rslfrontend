import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { CompanyProfile, PublicHoliday, PublicHolidayFormData, WorkingHoursConfig } from '../../../../core/models/hr.model';
import { Department } from '../../../../core/models/procurement.model';
import { AuthService } from '../../../../core/services/auth.service';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { HrNavComponent } from '../../components/hr-nav/hr-nav.component';
import { WORKING_DAYS } from '../../constants/hr.constants';
import { canManageAdminSettings } from '../../utils/hr-permissions.util';

@Component({
  selector: 'app-admin',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    HrNavComponent,
    ModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './admin.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly departments = signal<Department[]>([]);
  readonly holidays = signal<PublicHoliday[]>([]);
  readonly loading = signal(true);
  readonly profileLoading = signal(true);
  readonly hoursLoading = signal(true);
  readonly holidaysLoading = signal(true);
  readonly error = signal(false);
  readonly savingProfile = signal(false);
  readonly savingHours = signal(false);
  readonly savingHoliday = signal(false);
  readonly holidayYear = signal(new Date().getFullYear());
  readonly showHolidayForm = signal(false);
  readonly selectedWorkingDays = signal<Set<string>>(new Set(['MON', 'TUE', 'WED', 'THU', 'FRI']));

  readonly workingDays = WORKING_DAYS;
  readonly formatDate = formatDate;
  readonly canManage = () => canManageAdminSettings(this.auth);

  readonly profileForm = this.fb.group({
    company_name: ['', Validators.required],
    tin: ['', Validators.required],
    vat_number: ['', Validators.required],
    address: ['', Validators.required],
    phone: [''],
    email: [''],
    website: [''],
    logo_url: [''],
  });

  readonly hoursForm = this.fb.group({
    hours_per_day: ['8', [Validators.required, Validators.min(1), Validators.max(24)]],
  });

  readonly holidayForm = this.fb.group({
    name: ['', Validators.required],
    date: ['', Validators.required],
    is_variable: [false],
  });

  ngOnInit(): void {
    this.departmentsService.getDepartments().subscribe((d) => this.departments.set(d));
    this.loadProfile();
    this.loadWorkingHours();
    this.loadHolidays();
    this.loading.set(false);
  }

  loadProfile(): void {
    this.profileLoading.set(true);
    this.hr
      .getCompanyProfile()
      .pipe(finalize(() => this.profileLoading.set(false)))
      .subscribe({
        next: (profile) => this.profileForm.patchValue(profile),
        error: () => this.error.set(true),
      });
  }

  loadWorkingHours(): void {
    this.hoursLoading.set(true);
    this.hr
      .getWorkingHours()
      .pipe(finalize(() => this.hoursLoading.set(false)))
      .subscribe({
        next: (config) => {
          this.hoursForm.patchValue({ hours_per_day: config.hours_per_day });
          const days = config.working_days
            ? config.working_days.split(',').map((d) => d.trim()).filter(Boolean)
            : ['MON', 'TUE', 'WED', 'THU', 'FRI'];
          this.selectedWorkingDays.set(new Set(days));
        },
        error: () => this.error.set(true),
      });
  }

  loadHolidays(): void {
    this.holidaysLoading.set(true);
    this.hr
      .getPublicHolidays(this.holidayYear())
      .pipe(finalize(() => this.holidaysLoading.set(false)))
      .subscribe({
        next: (rows) => this.holidays.set(rows),
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to load holidays')),
      });
  }

  onYearChange(year: number): void {
    this.holidayYear.set(year);
    this.loadHolidays();
  }

  isDaySelected(day: string): boolean {
    return this.selectedWorkingDays().has(day);
  }

  toggleDay(day: string): void {
    const next = new Set(this.selectedWorkingDays());
    if (next.has(day)) next.delete(day);
    else next.add(day);
    this.selectedWorkingDays.set(next);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.notification.error('Please complete all required profile fields.');
      return;
    }
    this.savingProfile.set(true);
    this.hr
      .updateCompanyProfile(this.profileForm.getRawValue() as Partial<CompanyProfile>)
      .pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe({
        next: (profile) => {
          this.notification.success('Company profile updated');
          this.profileForm.patchValue(profile);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to update profile')),
      });
  }

  saveWorkingHours(): void {
    if (this.hoursForm.invalid || !this.selectedWorkingDays().size) {
      this.notification.error('Select at least one working day.');
      return;
    }
    const data: Partial<WorkingHoursConfig> = {
      hours_per_day: String(this.hoursForm.controls.hours_per_day.value ?? '8'),
      working_days: [...this.selectedWorkingDays()].join(','),
    };
    this.savingHours.set(true);
    this.hr
      .updateWorkingHours(data)
      .pipe(finalize(() => this.savingHours.set(false)))
      .subscribe({
        next: () => this.notification.success('Working hours updated'),
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to update working hours')),
      });
  }

  openHolidayForm(): void {
    this.holidayForm.reset({
      name: '',
      date: '',
      is_variable: false,
    });
    this.showHolidayForm.set(true);
  }

  saveHoliday(): void {
    if (this.holidayForm.invalid) {
      this.holidayForm.markAllAsTouched();
      this.notification.error('Please complete all holiday fields.');
      return;
    }
    const raw = this.holidayForm.getRawValue();
    const data: PublicHolidayFormData = {
      name: (raw.name ?? '').trim(),
      date: raw.date ?? '',
      is_variable: raw.is_variable ?? false,
      year: this.holidayYear(),
    };
    this.savingHoliday.set(true);
    this.hr
      .createPublicHoliday(data)
      .pipe(finalize(() => this.savingHoliday.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Holiday added');
          this.showHolidayForm.set(false);
          this.loadHolidays();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to add holiday')),
      });
  }
}
