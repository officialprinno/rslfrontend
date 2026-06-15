import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { DisciplinaryFormData, DisciplinaryRecord, EmployeeListItem } from '../../../../core/models/hr.model';
import { AuthService } from '../../../../core/services/auth.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { extractFieldErrors, getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { HrNavComponent } from '../../components/hr-nav/hr-nav.component';
import { DISCIPLINARY_TYPES, disciplinaryTypeLabel } from '../../constants/hr.constants';
import { canManageDisciplinary } from '../../utils/hr-permissions.util';

@Component({
  selector: 'app-disciplinary',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    HrNavComponent,
    ModalComponent,
    PaginationComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './disciplinary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisciplinaryComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly items = signal<DisciplinaryRecord[]>([]);
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly showForm = signal(false);
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly disciplinaryTypes = DISCIPLINARY_TYPES;
  readonly formatDate = formatDate;
  readonly disciplinaryTypeLabel = disciplinaryTypeLabel;
  readonly canAdd = () => canManageDisciplinary(this.auth);

  readonly form = this.fb.group({
    employee: [null as number | null, Validators.required],
    incident_date: ['', Validators.required],
    record_type: ['VERBAL_WARNING' as DisciplinaryRecord['record_type'], Validators.required],
    description: ['', Validators.required],
    action_taken: [''],
    witness: [''],
    employee_acknowledged: [false],
  });

  ngOnInit(): void {
    this.hr.getEmployees().subscribe((data) => this.employees.set(data.results));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.hr
      .getDisciplinaryRecords({
        page: this.page(),
        page_size: this.pageSize(),
        ordering: '-incident_date',
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.items.set(data.results);
          this.total.set(data.count);
        },
        error: () => this.error.set(true),
      });
  }

  employeeOptions() {
    return this.employees().map((e) => ({
      value: e.id,
      label: e.full_name,
      sublabel: `${e.employee_number} · ${e.department_name}`,
    }));
  }

  setEmployee(value: number | string | null): void {
    this.form.controls.employee.setValue(typeof value === 'number' ? value : null);
  }

  truncate(text: string, max = 60): string {
    if (!text) return '—';
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }

  openAdd(): void {
    this.fieldErrors.set({});
    this.form.reset({
      employee: null,
      incident_date: new Date().toISOString().slice(0, 10),
      record_type: 'VERBAL_WARNING',
      description: '',
      action_taken: '',
      witness: '',
      employee_acknowledged: false,
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
    const data: DisciplinaryFormData = {
      employee: raw.employee!,
      incident_date: raw.incident_date ?? '',
      record_type: raw.record_type ?? 'VERBAL_WARNING',
      description: (raw.description ?? '').trim(),
      action_taken: raw.action_taken ?? '',
      witness: raw.witness ?? '',
      employee_acknowledged: raw.employee_acknowledged ?? false,
    };
    this.saving.set(true);
    this.hr
      .createDisciplinaryRecord(data)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Disciplinary record created');
          this.showForm.set(false);
          this.load();
        },
        error: (err) => {
          const httpErr = err as { error?: { errors?: unknown } };
          if (httpErr.error?.errors) {
            this.fieldErrors.set(extractFieldErrors(httpErr.error.errors as never));
          }
          this.notification.error(getApiErrorMessage(err, 'Failed to save record'));
        },
      });
  }
}
