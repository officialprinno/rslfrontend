import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { InterLocationMovement } from '../../../../../core/models/security.model';
import { SecurityService } from '../../../../../core/services/security.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../../core/utils/api.util';
import { formatDateTime } from '../../../../../core/utils/format.util';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { SecurityNavComponent } from '../../../components/security-nav/security-nav.component';
import { MOVEMENT_STATUSES } from '../../../constants/security.constants';
import { canOperateSecurity } from '../../../utils/security-permissions.util';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-movements-list',
  imports: [FormsModule, PageHeaderComponent, SecurityNavComponent],
  template: `
    <app-page-header title="Inter-Location Movement" subtitle="Main Office ↔ Stein Factory (2.5km)">
      @if (canOperate()) {
        <button type="button" class="btn-primary" (click)="showModal.set(true)">Log Movement</button>
      }
    </app-page-header>
    <app-security-nav />
    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="stat-card"><p class="stat-label">In Transit</p><p class="stat-value text-[#8B5CF6]">{{ inTransit() }}</p></div>
      <div class="stat-card"><p class="stat-label">Today Total</p><p class="stat-value">{{ movements().length }}</p></div>
      <div class="stat-card"><p class="stat-label">Overdue</p><p class="stat-value text-red-600">{{ overdue() }}</p></div>
    </div>
    <div class="card overflow-x-auto">
      <table class="data-table w-full">
        <thead><tr><th>No.</th><th>Name</th><th>Direction</th><th>Departed</th><th>ETA</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (m of movements(); track m.id) {
            <tr>
              <td>{{ m.movement_number }}</td>
              <td>{{ m.employee_name || m.vehicle_registration || '—' }}</td>
              <td>{{ m.from_location_name }} → {{ m.to_location_name }}</td>
              <td>{{ formatDateTime(m.departure_time) }}</td>
              <td>{{ formatDateTime(m.expected_arrival) }}</td>
              <td><span [class]="statusColor(m.status)">{{ m.status }}</span></td>
              <td>@if (canOperate() && m.status !== 'ARRIVED') {
                <button type="button" class="text-xs text-green-600" (click)="arrive(m)">Mark Arrived</button>
              }</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    @if (showModal()) {
      <div class="modal-overlay" (click)="showModal.set(false)">
        <div class="modal-container max-w-lg" (click)="$event.stopPropagation()">
          <div class="modal-body space-y-3">
            <h3 class="font-semibold">Log Movement</h3>
            <select class="input-field w-full" [(ngModel)]="form.from_location">
              @for (l of locations(); track l.id) { <option [value]="l.id">From: {{ l.name }}</option> }
            </select>
            <select class="input-field w-full" [(ngModel)]="form.to_location">
              @for (l of locations(); track l.id) { <option [value]="l.id">To: {{ l.name }}</option> }
            </select>
            <input class="input-field w-full" placeholder="Purpose *" [(ngModel)]="form.purpose" />
            <div class="flex gap-2 justify-end">
              <button type="button" class="btn-secondary" (click)="showModal.set(false)">Cancel</button>
              <button type="button" class="btn-primary" (click)="save()">Log Movement</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementsListComponent implements OnInit {
  private readonly security = inject(SecurityService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly movements = signal<InterLocationMovement[]>([]);
  readonly locations = signal<{ id: number; name: string }[]>([]);
  readonly showModal = signal(false);
  readonly formatDateTime = formatDateTime;
  readonly statusColor = (s: string) => MOVEMENT_STATUSES[s] ?? 'badge-gray';
  readonly canOperate = () => canOperateSecurity(this.auth);
  readonly inTransit = () => this.movements().filter((m) => m.status === 'IN_TRANSIT').length;
  readonly overdue = () => this.movements().filter((m) => m.status === 'OVERDUE').length;

  form = {
    movement_type: 'EMPLOYEE',
    from_location: 0,
    to_location: 0,
    departure_time: new Date().toISOString(),
    expected_arrival: new Date(Date.now() + 15 * 60000).toISOString(),
    purpose: '',
    passengers: [] as string[],
  };

  ngOnInit(): void {
    this.security.getLocations().subscribe((l) => {
      this.locations.set(l);
      if (l.length >= 2) {
        this.form.from_location = l[0].id;
        this.form.to_location = l[1].id;
      }
    });
    this.load();
  }

  load(): void {
    this.security.getMovements({ page_size: 50 }).subscribe({
      next: (d) => this.movements.set(d.results),
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  save(): void {
    this.security.logMovement(this.form).subscribe({
      next: () => { this.showModal.set(false); this.load(); this.notification.success('Movement logged'); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  arrive(m: InterLocationMovement): void {
    this.security.markArrived(m.id).subscribe({
      next: () => { this.load(); this.notification.success('Arrival confirmed'); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
