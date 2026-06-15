import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SecurityShift } from '../../../../../core/models/security.model';
import { SecurityService } from '../../../../../core/services/security.service';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { SecurityNavComponent } from '../../../components/security-nav/security-nav.component';

@Component({
  selector: 'app-shifts-list',
  imports: [FormsModule, PageHeaderComponent, SecurityNavComponent],
  template: `
    <app-page-header title="Shift Management" [subtitle]="'Location: ' + locationName()" />
    <app-security-nav />
    <div class="mb-4">
      <select class="input-field !w-auto" [(ngModel)]="locationId" (change)="load()">
        @for (l of locations(); track l.id) {
          <option [value]="l.id">{{ l.icon }} {{ l.name }}</option>
        }
      </select>
    </div>
    <div class="card overflow-x-auto">
      <table class="data-table w-full">
        <thead><tr><th>Date</th><th>Shift</th><th>Officers</th><th>Min Required</th><th>Status</th><th>Handover</th></tr></thead>
        <tbody>
          @for (s of shifts(); track s.id) {
            <tr [class.bg-orange-50]="s.is_understaffed">
              <td>{{ s.date }}</td>
              <td>{{ s.shift_type }}</td>
              <td>{{ s.officers_count }}</td>
              <td>{{ s.minimum_required }}</td>
              <td><span [class]="s.is_understaffed ? 'badge-orange' : 'badge-green'">{{ s.status }}</span></td>
              <td>{{ s.handover_submitted ? '✓' : '—' }}</td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="text-center text-gray-400 py-8">No shifts scheduled</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShiftsListComponent implements OnInit {
  private readonly security = inject(SecurityService);
  readonly shifts = signal<SecurityShift[]>([]);
  readonly locations = signal<{ id: number; name: string; icon: string }[]>([]);
  locationId = 0;

  locationName = () => this.locations().find((l) => l.id === this.locationId)?.name ?? '';

  ngOnInit(): void {
    this.security.getLocations().subscribe((l) => {
      this.locations.set(l);
      if (l.length) { this.locationId = l[0].id; this.load(); }
    });
  }

  load(): void {
    this.security.getShifts({ location: this.locationId }).subscribe((d) => this.shifts.set(d.results));
  }
}
