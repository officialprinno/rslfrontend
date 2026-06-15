import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import { SecurityOfficer } from '../../../../../core/models/security.model';
import { SecurityService } from '../../../../../core/services/security.service';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { SecurityNavComponent } from '../../../components/security-nav/security-nav.component';
import { SECURITY_RANKS } from '../../../constants/security.constants';

@Component({
  selector: 'app-personnel-list',
  imports: [PageHeaderComponent, SecurityNavComponent],
  template: `
    <app-page-header title="Security Personnel" />
    <app-security-nav />
    <div class="card overflow-x-auto">
      <table class="data-table w-full">
        <thead><tr><th>Name</th><th>Rank</th><th>Location</th><th>Post</th><th>Cert. Expiry</th><th>Status</th></tr></thead>
        <tbody>
          @for (p of personnel(); track p.id) {
            <tr>
              <td>{{ p.full_name }} <span class="text-xs text-gray-400">{{ p.employee_number }}</span></td>
              <td><span [class]="rankColor(p.rank)">{{ p.rank }}</span></td>
              <td>{{ p.primary_location_name || p.assignment_scope }}</td>
              <td>{{ p.post_station || '—' }}</td>
              <td>{{ p.certification_expiry || '—' }}</td>
              <td><span [class]="p.is_on_duty ? 'badge-green' : 'badge-gray'">{{ p.is_on_duty ? 'On Duty' : 'Off Duty' }}</span></td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="text-center text-gray-400 py-8">No security personnel registered</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonnelListComponent implements OnInit {
  private readonly security = inject(SecurityService);
  readonly personnel = signal<SecurityOfficer[]>([]);
  readonly rankColor = (r: string) => SECURITY_RANKS[r] ?? 'badge-gray';

  ngOnInit(): void {
    this.security.getPersonnel().subscribe((d) => this.personnel.set(d.results));
  }
}
