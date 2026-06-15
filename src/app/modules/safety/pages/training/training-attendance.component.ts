import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { EmployeeListItem } from '../../../../core/models/hr.model';
import { SafetyTraining, TrainingAttendee } from '../../../../core/models/safety.model';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SafetyService } from '../../../../core/services/safety.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SafetyNavComponent } from '../../components/safety-nav/safety-nav.component';
import { trainingTypeLabel } from '../../constants/safety.constants';

interface AttendanceRow {
  employee: number;
  employee_name: string;
  department_name: string;
  attended: boolean;
  certificate_issued: boolean;
  certificate_expiry: string;
  notes: string;
  selected: boolean;
}

@Component({
  selector: 'app-training-attendance',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SafetyNavComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './training-attendance.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingAttendanceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly safety = inject(SafetyService);
  private readonly hr = inject(HrService);
  private readonly notification = inject(NotificationService);

  readonly training = signal<SafetyTraining | null>(null);
  readonly rows = signal<AttendanceRow[]>([]);
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly search = signal('');
  readonly addEmployeeId = signal<number | ''>('');

  readonly formatDateTime = formatDateTime;
  readonly trainingTypeLabel = trainingTypeLabel;

  readonly filteredRows = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter((r) => r.employee_name.toLowerCase().includes(q));
  });

  readonly selectedCount = computed(() => this.rows().filter((r) => r.selected).length);
  readonly attendedCount = computed(() => this.rows().filter((r) => r.attended).length);
  readonly allFilteredSelected = computed(() => {
    const filtered = this.filteredRows();
    return filtered.length > 0 && filtered.every((r) => r.selected);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/safety/training']);
      return;
    }
    this.load(+id);
    this.hr.getEmployees({ page_size: 300, status: 'ACTIVE' }).subscribe({
      next: (d) => this.employees.set(d.results),
    });
  }

  load(id: number): void {
    this.loading.set(true);
    this.safety
      .getTraining(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (t) => {
          this.training.set(t);
          this.rows.set(this.buildRows(t.attendees));
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  toggleAttended(employeeId: number): void {
    this.rows.set(
      this.rows().map((r) =>
        r.employee === employeeId ? { ...r, attended: !r.attended } : r,
      ),
    );
  }

  toggleSelected(employeeId: number): void {
    this.rows.set(
      this.rows().map((r) =>
        r.employee === employeeId ? { ...r, selected: !r.selected } : r,
      ),
    );
  }

  toggleSelectAll(checked: boolean): void {
    const filteredIds = new Set(this.filteredRows().map((r) => r.employee));
    this.rows.set(
      this.rows().map((r) =>
        filteredIds.has(r.employee) ? { ...r, selected: checked } : r,
      ),
    );
  }

  markAllPresent(): void {
    this.rows.set(this.rows().map((r) => (r.selected ? { ...r, attended: true } : r)));
  }

  markAllAbsent(): void {
    this.rows.set(this.rows().map((r) => (r.selected ? { ...r, attended: false } : r)));
  }

  issueCertificatesSelected(): void {
    this.rows.set(
      this.rows().map((r) =>
        r.selected && r.attended ? { ...r, certificate_issued: true } : r,
      ),
    );
    this.notification.success('Certificates flagged for selected attendees');
  }

  addAttendee(): void {
    const empId = this.addEmployeeId();
    if (!empId) return;
    if (this.rows().some((r) => r.employee === empId)) {
      this.notification.error('Employee already on attendance list');
      return;
    }
    const emp = this.employees().find((e) => e.id === empId);
    if (!emp) return;
    this.rows.set([
      ...this.rows(),
      {
        employee: emp.id,
        employee_name: emp.full_name,
        department_name: emp.department_name,
        attended: false,
        certificate_issued: false,
        certificate_expiry: '',
        notes: '',
        selected: false,
      },
    ]);
    this.addEmployeeId.set('');
  }

  updateNotes(employeeId: number, notes: string): void {
    this.rows.set(
      this.rows().map((r) => (r.employee === employeeId ? { ...r, notes } : r)),
    );
  }

  save(): void {
    const t = this.training();
    if (!t) return;
    this.saving.set(true);
    const attendees: Partial<TrainingAttendee>[] = this.rows().map((r) => ({
      employee: r.employee,
      attended: r.attended,
      certificate_issued: r.certificate_issued,
      certificate_expiry: r.certificate_expiry || null,
      notes: r.notes,
    }));
    this.safety
      .markAttendance(t.id, attendees)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Attendance saved');
          this.load(t.id);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  private buildRows(attendees: TrainingAttendee[]): AttendanceRow[] {
    return attendees.map((a) => ({
      employee: a.employee,
      employee_name: a.employee_name,
      department_name: a.department_name,
      attended: a.attended,
      certificate_issued: a.certificate_issued,
      certificate_expiry: a.certificate_expiry?.slice(0, 10) ?? '',
      notes: a.notes,
      selected: false,
    }));
  }
}
