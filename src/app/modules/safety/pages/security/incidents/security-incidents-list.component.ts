import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SecurityIncident } from '../../../../../core/models/security.model';
import { SecurityService } from '../../../../../core/services/security.service';
import { formatDateTime } from '../../../../../core/utils/format.util';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { SecurityNavComponent } from '../../../components/security-nav/security-nav.component';
import { SEC_INCIDENT_TYPE_COLORS } from '../../../constants/security.constants';
import { canOperateSecurity } from '../../../utils/security-permissions.util';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-security-incidents-list',
  imports: [RouterLink, PageHeaderComponent, SecurityNavComponent],
  template: `
    <app-page-header title="Security Incidents">
      @if (canOperate()) {
        <a routerLink="/safety/security/incidents/new" class="btn-primary">Report Incident</a>
      }
    </app-page-header>
    <app-security-nav />
    <div class="card overflow-x-auto">
      <table class="data-table w-full">
        <thead><tr><th>No.</th><th>Date</th><th>Type</th><th>Location</th><th>Severity</th><th>Status</th><th>Days Open</th></tr></thead>
        <tbody>
          @for (i of incidents(); track i.id) {
            <tr>
              <td>{{ i.incident_number }}</td>
              <td>{{ formatDateTime(i.date_occurred) }}</td>
              <td><span [class]="typeColor(i.incident_type)">{{ i.incident_type }}</span></td>
              <td>{{ i.location_name }}</td>
              <td><span [class]="severityColor(i.severity)">{{ i.severity }}</span></td>
              <td><span [class]="statusColor(i.status)">{{ i.status }}</span></td>
              <td [class.text-red-600]="i.days_open > 14">{{ i.days_open }}</td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="text-center text-gray-400 py-8">No security incidents</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityIncidentsListComponent implements OnInit {
  private readonly security = inject(SecurityService);
  private readonly auth = inject(AuthService);
  readonly incidents = signal<SecurityIncident[]>([]);
  readonly formatDateTime = formatDateTime;
  readonly typeColor = (t: string) => SEC_INCIDENT_TYPE_COLORS[t] ?? 'badge-gray';
  readonly severityColor = (s: string) => (s === 'CRITICAL' || s === 'HIGH' ? 'badge-red' : 'badge-orange');
  readonly statusColor = (s: string) => (s === 'CLOSED' ? 'badge-green' : s === 'OPEN' ? 'badge-red' : 'badge-orange');
  readonly canOperate = () => canOperateSecurity(this.auth);

  ngOnInit(): void {
    this.security.getIncidents().subscribe((d) => this.incidents.set(d.results));
  }
}
