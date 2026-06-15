import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { SafetyIncident } from '../../../../core/models/safety.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SafetyService } from '../../../../core/services/safety.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SafetyNavComponent } from '../../components/safety-nav/safety-nav.component';
import {
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_STATUS_COLORS,
  INCIDENT_TYPE_COLORS,
  INCIDENT_TYPES,
  LOCATIONS,
  SEVERITY_COLORS,
  incidentTypeLabel,
} from '../../constants/safety.constants';
import {
  canCloseIncident,
  canInvestigateIncident,
  canReportIncident,
} from '../../utils/safety-permissions.util';

@Component({
  selector: 'app-incidents-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SafetyNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './incidents-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentsListComponent implements OnInit {
  private readonly safety = inject(SafetyService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  readonly router = inject(Router);

  readonly incidents = signal<SafetyIncident[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly typeFilter = signal('');
  readonly severityFilter = signal('');
  readonly statusFilter = signal('');
  readonly locationFilter = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');

  readonly incidentTypes = INCIDENT_TYPES;
  readonly severities = INCIDENT_SEVERITIES;
  readonly statusOptions = INCIDENT_STATUSES;
  readonly locations = LOCATIONS;
  readonly formatDateTime = formatDateTime;
  readonly incidentTypeLabel = incidentTypeLabel;
  readonly typeColor = (t: string) => INCIDENT_TYPE_COLORS[t] ?? 'badge-gray';
  readonly severityColor = (s: string) => SEVERITY_COLORS[s as keyof typeof SEVERITY_COLORS] ?? 'badge-gray';
  readonly statusColor = (s: string) => INCIDENT_STATUS_COLORS[s] ?? 'badge-gray';

  readonly canReport = () => canReportIncident(this.auth);
  readonly canInvestigate = () => canInvestigateIncident(this.auth);
  readonly canClose = () => canCloseIncident(this.auth);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 15,
      ordering: '-date_occurred',
    };
    if (this.search()) params['search'] = this.search();
    if (this.typeFilter()) params['incident_type'] = this.typeFilter();
    if (this.severityFilter()) params['severity'] = this.severityFilter();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.locationFilter()) params['location'] = this.locationFilter();
    if (this.dateFrom()) params['date_from'] = this.dateFrom();
    if (this.dateTo()) params['date_to'] = this.dateTo();

    this.safety
      .getIncidents(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.incidents.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  startInvestigation(inc: SafetyIncident): void {
    this.confirm
      .open({
        title: 'Start Investigation',
        message: `Begin investigation for incident ${inc.incident_number}?`,
        confirmLabel: 'Start Investigation',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.safety.startInvestigation(inc.id).subscribe({
          next: () => {
            this.notification.success('Investigation started');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e)),
        });
      });
  }

  goToClose(inc: SafetyIncident): void {
    this.router.navigate(['/safety/incidents', inc.id, 'view'], {
      queryParams: { tab: 'closure' },
    });
  }

  exportExcel(): void {
    exportToExcel('safety-incidents', [
      { key: 'incident_number', label: 'Incident No.' },
      { key: 'incident_type', label: 'Type' },
      { key: 'severity', label: 'Severity' },
      { key: 'date_occurred', label: 'Date Occurred' },
      { key: 'location', label: 'Location' },
      { key: 'department_name', label: 'Department' },
      { key: 'injured_person_name', label: 'Injured Person' },
      { key: 'reported_by_name', label: 'Reported By' },
      { key: 'status', label: 'Status' },
      { key: 'days_open', label: 'Days Open' },
    ], this.incidents().map((i) => ({
      ...i,
      incident_type: incidentTypeLabel(i.incident_type),
      date_occurred: formatDateTime(i.date_occurred),
    })));
  }
}
