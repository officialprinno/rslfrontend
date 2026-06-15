import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { WorkPermit } from '../../../../core/models/safety.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SafetyService } from '../../../../core/services/safety.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SafetyNavComponent } from '../../components/safety-nav/safety-nav.component';
import {
  LOCATIONS,
  PERMIT_STATUSES,
  PERMIT_STATUS_COLORS,
  PERMIT_TYPE_COLORS,
  PERMIT_TYPES,
  permitTypeLabel,
} from '../../constants/safety.constants';
import { canReportIncident } from '../../utils/safety-permissions.util';

@Component({
  selector: 'app-permits-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SafetyNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './permits-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermitsListComponent implements OnInit {
  private readonly safety = inject(SafetyService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly permits = signal<WorkPermit[]>([]);
  readonly loading = signal(true);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly typeFilter = signal('');
  readonly statusFilter = signal('');
  readonly locationFilter = signal('');
  readonly activeOnly = signal(false);
  readonly dateFrom = signal('');
  readonly dateTo = signal('');

  readonly permitTypes = PERMIT_TYPES;
  readonly statusOptions = PERMIT_STATUSES;
  readonly locations = LOCATIONS;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly permitTypeLabel = permitTypeLabel;
  readonly typeColor = (t: string) => PERMIT_TYPE_COLORS[t as keyof typeof PERMIT_TYPE_COLORS] ?? 'badge-gray';
  readonly statusColor = (s: string) => PERMIT_STATUS_COLORS[s] ?? 'badge-gray';
  readonly canCreate = () => canReportIncident(this.auth);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number | boolean> = {
      page: this.page(),
      page_size: 15,
      ordering: '-valid_from',
    };
    if (this.search()) params['search'] = this.search();
    if (this.typeFilter()) params['permit_type'] = this.typeFilter();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.locationFilter()) params['location'] = this.locationFilter();
    if (this.activeOnly()) params['active_only'] = true;
    if (this.dateFrom()) params['date_from'] = this.dateFrom();
    if (this.dateTo()) params['date_to'] = this.dateTo();

    this.safety
      .getWorkPermits(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.permits.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  exportExcel(): void {
    exportToExcel('work-permits', [
      { key: 'permit_number', label: 'Permit No.' },
      { key: 'permit_type', label: 'Type' },
      { key: 'work_description', label: 'Work Description' },
      { key: 'location', label: 'Location' },
      { key: 'valid_from', label: 'Valid From' },
      { key: 'valid_until', label: 'Valid Until' },
      { key: 'risk_level', label: 'Risk Level' },
      { key: 'issued_by_name', label: 'Issued By' },
      { key: 'status', label: 'Status' },
    ], this.permits().map((p) => ({
      ...p,
      permit_type: permitTypeLabel(p.permit_type),
      valid_from: formatDateTime(p.valid_from),
      valid_until: formatDateTime(p.valid_until),
    })));
  }
}
