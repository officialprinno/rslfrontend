import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { SafetyTraining, TrainingType } from '../../../../core/models/safety.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SafetyService } from '../../../../core/services/safety.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SafetyNavComponent } from '../../components/safety-nav/safety-nav.component';
import {
  LOCATIONS,
  TRAINING_STATUSES,
  TRAINING_TYPE_COLORS,
  TRAINING_TYPES,
  trainingTypeLabel,
} from '../../constants/safety.constants';
import { canScheduleTraining } from '../../utils/safety-permissions.util';

@Component({
  selector: 'app-training-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SafetyNavComponent,
    ModalComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './training-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingListComponent implements OnInit {
  private readonly safety = inject(SafetyService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly trainings = signal<SafetyTraining[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly typeFilter = signal('');
  readonly statusFilter = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly showSchedule = signal(false);

  readonly trainingTypes = TRAINING_TYPES;
  readonly statusOptions = TRAINING_STATUSES;
  readonly locations = LOCATIONS;
  readonly formatDateTime = formatDateTime;
  readonly trainingTypeLabel = trainingTypeLabel;
  readonly typeColor = (t: string) => TRAINING_TYPE_COLORS[t as TrainingType] ?? 'badge-gray';
  readonly canSchedule = () => canScheduleTraining(this.auth);

  readonly scheduleForm = this.fb.group({
    training_name: ['', Validators.required],
    training_type: ['INDUCTION' as TrainingType, Validators.required],
    description: [''],
    trainer: ['', Validators.required],
    scheduled_date: ['', Validators.required],
    duration_hours: [4, [Validators.required, Validators.min(0.5)]],
    location: [''],
    max_attendees: [30, [Validators.required, Validators.min(1)]],
    materials_notes: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 15,
      ordering: '-scheduled_date',
    };
    if (this.search()) params['search'] = this.search();
    if (this.typeFilter()) params['training_type'] = this.typeFilter();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.dateFrom()) params['date_from'] = this.dateFrom();
    if (this.dateTo()) params['date_to'] = this.dateTo();

    this.safety
      .getTrainings(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.trainings.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openSchedule(): void {
    this.scheduleForm.reset({
      training_type: 'INDUCTION',
      duration_hours: 4,
      max_attendees: 30,
    });
    this.showSchedule.set(true);
  }

  submitSchedule(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.scheduleForm.getRawValue();
    this.safety
      .scheduleTraining({
        training_name: raw.training_name!,
        training_type: raw.training_type!,
        description: raw.description || undefined,
        trainer: raw.trainer!,
        scheduled_date: raw.scheduled_date!,
        duration_hours: raw.duration_hours!,
        location: raw.location || undefined,
        max_attendees: raw.max_attendees ?? undefined,
        materials_notes: raw.materials_notes || undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Training scheduled');
          this.showSchedule.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  exportExcel(): void {
    exportToExcel('safety-training', [
      { key: 'training_name', label: 'Training Name' },
      { key: 'training_type', label: 'Type' },
      { key: 'trainer', label: 'Trainer' },
      { key: 'scheduled_date', label: 'Scheduled Date' },
      { key: 'duration_hours', label: 'Duration (hrs)' },
      { key: 'location', label: 'Location' },
      { key: 'attendees_count', label: 'Attendees' },
      { key: 'completion_rate', label: 'Completion %' },
      { key: 'status', label: 'Status' },
    ], this.trainings().map((t) => ({
      ...t,
      training_type: trainingTypeLabel(t.training_type),
      scheduled_date: formatDateTime(t.scheduled_date),
    })));
  }
}
