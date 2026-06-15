import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { VehicleLog } from '../../../../../core/models/security.model';
import { SecurityService } from '../../../../../core/services/security.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../../core/utils/api.util';
import { formatDateTime } from '../../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../../shared/components/table-skeleton/table-skeleton.component';
import { SecurityNavComponent } from '../../../components/security-nav/security-nav.component';
import { VEHICLE_TYPES } from '../../../constants/security.constants';
import { canOperateSecurity } from '../../../utils/security-permissions.util';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-vehicles-list',
  imports: [FormsModule, PageHeaderComponent, SecurityNavComponent, EmptyStateComponent, TableSkeletonComponent],
  template: `
    <app-page-header title="Vehicle Access Log">
      @if (canOperate()) {
        <button type="button" class="btn-primary" (click)="showModal.set(true)">Log Vehicle Entry</button>
      }
    </app-page-header>
    <app-security-nav />
    @if (loading()) { <app-table-skeleton [rows]="6" /> }
    @else if (!logs().length) { <app-empty-state title="No vehicles" message="No vehicles on premises." /> }
    @else {
      <div class="card overflow-x-auto">
        <table class="data-table w-full">
          <thead><tr><th>Reg No.</th><th>Type</th><th>Driver</th><th>Location</th><th>Time In</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (v of logs(); track v.id) {
              <tr>
                <td class="font-semibold">{{ v.registration_number }}</td>
                <td><span [class]="typeColor(v.vehicle_type)">{{ v.vehicle_type }}</span></td>
                <td>{{ v.driver_name }}</td>
                <td>{{ v.location_name }}</td>
                <td>{{ formatDateTime(v.time_in) }}</td>
                <td><span class="badge-green">{{ v.status }}</span></td>
                <td>@if (canOperate() && v.status === 'ON_PREMISES') {
                  <button type="button" class="text-xs text-[#1B3A6B]" (click)="exit(v)">Log Exit</button>
                }</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    @if (showModal()) {
      <div class="modal-overlay" (click)="showModal.set(false)">
        <div class="modal-container max-w-lg" (click)="$event.stopPropagation()">
          <div class="modal-body space-y-3">
            <h3 class="font-semibold">Log Vehicle Entry</h3>
            <input class="input-field w-full" placeholder="Registration *" [(ngModel)]="entryForm.registration_number" />
            <select class="input-field w-full" [(ngModel)]="entryForm.vehicle_type">
              <option value="COMPANY">Company</option><option value="EMPLOYEE">Employee</option>
              <option value="VISITOR">Visitor</option><option value="SUPPLIER">Supplier</option>
            </select>
            <input class="input-field w-full" placeholder="Driver name *" [(ngModel)]="entryForm.driver_name" />
            <select class="input-field w-full" [(ngModel)]="entryForm.location">
              @for (l of locations(); track l.id) { <option [value]="l.id">{{ l.name }}</option> }
            </select>
            <input class="input-field w-full" placeholder="Purpose" [(ngModel)]="entryForm.purpose" />
            <div class="flex gap-2 justify-end">
              <button type="button" class="btn-secondary" (click)="showModal.set(false)">Cancel</button>
              <button type="button" class="btn-primary" (click)="logEntry()">Save</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiclesListComponent implements OnInit {
  private readonly security = inject(SecurityService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly logs = signal<VehicleLog[]>([]);
  readonly locations = signal<{ id: number; name: string }[]>([]);
  readonly loading = signal(true);
  readonly showModal = signal(false);
  readonly formatDateTime = formatDateTime;
  readonly typeColor = (t: string) => VEHICLE_TYPES[t] ?? 'badge-gray';
  readonly canOperate = () => canOperateSecurity(this.auth);

  entryForm = {
    registration_number: '',
    vehicle_type: 'VISITOR',
    driver_name: '',
    location: 0,
    purpose: 'DELIVERY',
    time_in: new Date().toISOString(),
    occupants_count: 1,
  };

  ngOnInit(): void {
    this.security.getLocations().subscribe((l) => {
      this.locations.set(l);
      if (l.length) this.entryForm.location = l[0].id;
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.security.getVehicleLogs({ on_premises: 'true' }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (d) => this.logs.set(d.results),
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  logEntry(): void {
    this.security.logVehicleEntry(this.entryForm as Partial<VehicleLog>).subscribe({
      next: () => { this.showModal.set(false); this.load(); this.notification.success('Vehicle logged'); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  exit(v: VehicleLog): void {
    this.security.logVehicleExit(v.id).subscribe({
      next: () => { this.load(); this.notification.success('Vehicle exited'); },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }
}
