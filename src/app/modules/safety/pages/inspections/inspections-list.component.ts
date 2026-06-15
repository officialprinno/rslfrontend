import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { SafetyInspection } from '../../../../core/models/safety.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SafetyService } from '../../../../core/services/safety.service';
import { UsersService } from '../../../../core/services/users.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SafetyNavComponent } from '../../components/safety-nav/safety-nav.component';
import {
  INSPECTION_AREAS,
  INSPECTION_STATUS_COLORS,
  INSPECTION_TYPE_COLORS,
  INSPECTION_TYPES,
  RESULT_COLORS,
  inspectionTypeLabel,
} from '../../constants/safety.constants';
import { canScheduleInspection } from '../../utils/safety-permissions.util';

@Component({
  selector: 'app-inspections-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SafetyNavComponent,
    ModalComponent,
    PaginationComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    SearchableSelectComponent,
  ],
  templateUrl: './inspections-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionsListComponent implements OnInit {
  private readonly safety = inject(SafetyService);
  private readonly usersService = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly inspections = signal<SafetyInspection[]>([]);
  readonly inspectors = signal<{ id: number; full_name: string; email: string }[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly startingId = signal<number | null>(null);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(15);

  readonly search = signal('');
  readonly typeFilter = signal('');
  readonly areaFilter = signal('');
  readonly statusFilter = signal('');
  readonly inspectorFilter = signal<number | ''>('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');

  readonly showSchedule = signal(false);
  readonly showView = signal(false);
  readonly viewing = signal<SafetyInspection | null>(null);
  readonly viewLoading = signal(false);

  readonly inspectionTypes = INSPECTION_TYPES;
  readonly inspectionAreas = INSPECTION_AREAS;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly inspectionTypeLabel = inspectionTypeLabel;
  readonly typeColor = (t: string) => INSPECTION_TYPE_COLORS[t as keyof typeof INSPECTION_TYPE_COLORS] ?? 'badge-gray';
  readonly resultColor = (r: string | null) => RESULT_COLORS[r ?? 'PENDING'] ?? 'badge-gray';
  readonly statusColor = (s: string) => INSPECTION_STATUS_COLORS[s] ?? 'badge-gray';
  readonly canSchedule = () => canScheduleInspection(this.auth);

  readonly scheduleForm = this.fb.group({
    inspection_type: ['DAILY' as SafetyInspection['inspection_type'], Validators.required],
    area: ['Factory Floor', Validators.required],
    scheduled_date: ['', Validators.required],
    inspector: [null as number | null, Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    this.usersService.getUsers().subscribe((users) => this.inspectors.set(users));
    this.load();
  }

  inspectorOptions() {
    return this.inspectors().map((u) => ({
      value: u.id,
      label: u.full_name,
      sublabel: u.email,
    }));
  }

  setInspector(value: number | string | null): void {
    this.scheduleForm.controls.inspector.setValue(typeof value === 'number' ? value : null);
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: this.pageSize(),
      ordering: '-scheduled_date',
    };
    if (this.search()) params['search'] = this.search();
    if (this.typeFilter()) params['inspection_type'] = this.typeFilter();
    if (this.areaFilter()) params['area'] = this.areaFilter();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.inspectorFilter()) params['inspector'] = this.inspectorFilter() as number;
    if (this.dateFrom()) params['date_from'] = this.dateFrom();
    if (this.dateTo()) params['date_to'] = this.dateTo();

    this.safety
      .getInspections(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.inspections.set(d.results);
          this.total.set(d.count);
        },
        error: () => this.error.set(true),
      });
  }

  openSchedule(): void {
    this.scheduleForm.reset({
      inspection_type: 'DAILY',
      area: 'Factory Floor',
      scheduled_date: '',
      inspector: null,
      notes: '',
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
    this.saving.set(true);
    this.safety
      .scheduleInspection({
        inspection_type: raw.inspection_type!,
        area: raw.area!,
        scheduled_date: raw.scheduled_date!,
        inspector: raw.inspector!,
        notes: raw.notes ?? '',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Inspection scheduled');
          this.showSchedule.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openView(item: SafetyInspection): void {
    this.viewing.set(null);
    this.viewLoading.set(true);
    this.showView.set(true);
    this.safety
      .getInspection(item.id)
      .pipe(finalize(() => this.viewLoading.set(false)))
      .subscribe({
        next: (d) => this.viewing.set(d),
        error: (e) => {
          this.notification.error(getApiErrorMessage(e));
          this.showView.set(false);
        },
      });
  }

  startInspection(item: SafetyInspection): void {
    this.startingId.set(item.id);
    this.safety
      .startInspection(item.id)
      .pipe(finalize(() => this.startingId.set(null)))
      .subscribe({
        next: () => {
          this.notification.success('Inspection started');
          this.router.navigate(['/safety/inspections', item.id, 'conduct']);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  itemsChecked(item: SafetyInspection): number {
    return item.passed_items + item.failed_items;
  }

  resultLabel(result: SafetyInspection['overall_result']): string {
    return result ?? 'PENDING';
  }
}
