import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  Appraisal,
  AppraisalCompleteData,
  AppraisalScheduleData,
  EmployeeListItem,
} from '../../../../core/models/hr.model';
import { AuthService } from '../../../../core/services/auth.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UsersService } from '../../../../core/services/users.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
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
import { APPRAISAL_PERIODS, appraisalPeriodLabel } from '../../constants/hr.constants';
import { canManageAppraisals } from '../../utils/hr-permissions.util';

function appraisalScoreLabel(score: number | null | undefined): string {
  if (score == null) return '—';
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Satisfactory';
  return 'Needs Improvement';
}

@Component({
  selector: 'app-appraisals',
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
  templateUrl: './appraisals.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppraisalsComponent implements OnInit {
  private readonly hr = inject(HrService);
  private readonly usersService = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly items = signal<Appraisal[]>([]);
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly reviewers = signal<{ id: number; full_name: string; email: string }[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly statusFilter = signal<'all' | 'SCHEDULED' | 'COMPLETED'>('all');
  readonly showSchedule = signal(false);
  readonly showComplete = signal(false);
  readonly completing = signal<Appraisal | null>(null);
  readonly completeScore = signal(75);

  readonly appraisalPeriods = APPRAISAL_PERIODS;
  readonly formatDate = formatDate;
  readonly appraisalPeriodLabel = appraisalPeriodLabel;
  readonly appraisalScoreLabel = appraisalScoreLabel;
  readonly canManage = () => canManageAppraisals(this.auth);

  readonly completeRatingPreview = computed(() => appraisalScoreLabel(this.completeScore()));

  readonly scheduleForm = this.fb.group({
    employee: [null as number | null, Validators.required],
    period: ['ANNUAL' as Appraisal['period'], Validators.required],
    period_label: ['', Validators.required],
    scheduled_date: ['', Validators.required],
    reviewer: [null as number | null],
  });

  readonly completeForm = this.fb.group({
    strengths: [''],
    improvements: [''],
    goals: [''],
    comments: [''],
    employee_acknowledged: [false],
  });

  ngOnInit(): void {
    this.hr.getEmployees().subscribe((data) => this.employees.set(data.results));
    this.usersService.getUsers().subscribe((users) =>
      this.reviewers.set(users.map((u) => ({ id: u.id, full_name: u.full_name, email: u.email }))),
    );
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: this.pageSize(),
      ordering: '-scheduled_date',
    };
    if (this.statusFilter() !== 'all') params['status'] = this.statusFilter();

    this.hr
      .getAppraisals(params)
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

  reviewerOptions() {
    return this.reviewers().map((u) => ({
      value: u.id,
      label: u.full_name,
      sublabel: u.email,
    }));
  }

  setEmployee(value: number | string | null): void {
    this.scheduleForm.controls.employee.setValue(typeof value === 'number' ? value : null);
  }

  setReviewer(value: number | string | null): void {
    this.scheduleForm.controls.reviewer.setValue(typeof value === 'number' ? value : null);
  }

  openSchedule(): void {
    this.scheduleForm.reset({
      employee: null,
      period: 'ANNUAL',
      period_label: '',
      scheduled_date: '',
      reviewer: null,
    });
    this.showSchedule.set(true);
  }

  onSchedule(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      this.notification.error('Please complete all required fields.');
      return;
    }
    const raw = this.scheduleForm.getRawValue();
    const data: AppraisalScheduleData = {
      employee: raw.employee!,
      period: raw.period ?? 'ANNUAL',
      period_label: (raw.period_label ?? '').trim(),
      scheduled_date: raw.scheduled_date ?? '',
      reviewer: raw.reviewer,
    };
    this.saving.set(true);
    this.hr
      .scheduleAppraisal(data)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Appraisal scheduled');
          this.showSchedule.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to schedule appraisal')),
      });
  }

  openComplete(item: Appraisal): void {
    this.completing.set(item);
    this.completeScore.set(item.score ?? 75);
    this.completeForm.reset({
      strengths: item.strengths ?? '',
      improvements: item.improvements ?? '',
      goals: item.goals ?? '',
      comments: item.comments ?? '',
      employee_acknowledged: item.employee_acknowledged ?? false,
    });
    this.showComplete.set(true);
  }

  onComplete(): void {
    const item = this.completing();
    if (!item) return;
    const raw = this.completeForm.getRawValue();
    const data: AppraisalCompleteData = {
      score: this.completeScore(),
      strengths: raw.strengths ?? '',
      improvements: raw.improvements ?? '',
      goals: raw.goals ?? '',
      comments: raw.comments ?? '',
      employee_acknowledged: raw.employee_acknowledged ?? false,
    };
    this.saving.set(true);
    this.hr
      .completeAppraisal(item.id, data)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Appraisal completed');
          this.showComplete.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to complete appraisal')),
      });
  }
}
