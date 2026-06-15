import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { SecurityNavComponent } from '../../../components/security-nav/security-nav.component';

@Component({
  selector: 'app-security-reports',
  imports: [PageHeaderComponent, SecurityNavComponent],
  template: `
    <app-page-header title="Security Reports" subtitle="Daily, monthly, and analysis reports" />
    <app-security-nav />
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      @for (r of reports; track r.title) {
        <div class="card hover:shadow-md transition-shadow cursor-pointer">
          <h4 class="font-semibold text-[#1B3A6B]">{{ r.title }}</h4>
          <p class="text-sm text-gray-500 mt-2">{{ r.description }}</p>
          <button type="button" class="btn-secondary mt-4 text-xs">Generate Report</button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityReportsComponent {
  readonly reports = [
    { title: 'Daily Security Report', description: 'Visitors, vehicles, incidents, movements, and shift handover per location.' },
    { title: 'Monthly Security Summary', description: 'Trends, statistics, and officer performance across Main Office and Stein.' },
    { title: 'Incident Analysis Report', description: 'Incidents by type, location, severity, and hotspot areas.' },
    { title: 'Visitor Statistics', description: 'Visitor frequency, top companies, overstaying incidents.' },
    { title: 'Inter-Location Movement Report', description: 'Travel times, overdue incidents, peak hours.' },
  ];
}
