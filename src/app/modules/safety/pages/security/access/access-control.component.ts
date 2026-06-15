import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AccessLog, AccessZone } from '../../../../../core/models/security.model';
import { SecurityService } from '../../../../../core/services/security.service';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { SecurityNavComponent } from '../../../components/security-nav/security-nav.component';
import { ACCESS_LEVELS } from '../../../constants/security.constants';
import { formatDateTime } from '../../../../../core/utils/format.util';

@Component({
  selector: 'app-access-control',
  imports: [FormsModule, PageHeaderComponent, SecurityNavComponent],
  template: `
    <app-page-header title="Access Control" subtitle="Zone and access management" />
    <app-security-nav />
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      @for (z of zones(); track z.id) {
        <div class="card" [style.borderLeft]="'4px solid ' + (z.location_name.includes('Stein') ? '#F0A500' : '#1B3A6B')">
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-semibold">🚪 {{ z.name }}</h4>
              <span [class]="levelColor(z.access_level)">{{ z.access_level }}</span>
            </div>
            <span class="text-xs text-gray-400">{{ z.location_name }}</span>
          </div>
          <p class="text-sm text-gray-500 mt-2">Events today: {{ z.events_today }}</p>
        </div>
      }
    </div>
    <div class="card">
      <h3 class="section-title mb-3">Access Log</h3>
      <table class="data-table w-full text-sm">
        <thead><tr><th>Time</th><th>Person</th><th>Zone</th><th>Action</th><th>Method</th><th>Officer</th></tr></thead>
        <tbody>
          @for (log of accessLogs(); track log.id) {
            <tr [class.bg-red-50]="log.action === 'DENIED' || log.action === 'FORCED'">
              <td>{{ formatDateTime(log.created_at) }}</td>
              <td>{{ log.person_name }}</td>
              <td>{{ log.zone_name || log.location_name }}</td>
              <td><span [class]="log.action === 'GRANTED' ? 'badge-green' : 'badge-red'">{{ log.action }}</span></td>
              <td>{{ log.method }}</td>
              <td>{{ log.security_officer_name }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessControlComponent implements OnInit {
  private readonly security = inject(SecurityService);
  readonly zones = signal<AccessZone[]>([]);
  readonly accessLogs = signal<AccessLog[]>([]);
  readonly formatDateTime = formatDateTime;
  readonly levelColor = (l: string) => ACCESS_LEVELS[l] ?? 'badge-gray';

  ngOnInit(): void {
    this.security.getZones().subscribe((z) => this.zones.set(z));
    this.security.getAccessLog({ page_size: 30 }).subscribe((d) => this.accessLogs.set(d.results));
  }
}
