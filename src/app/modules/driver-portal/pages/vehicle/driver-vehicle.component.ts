import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { DriverDashboard } from '../../../../core/models/driver-portal.model';
import { DriverPortalService } from '../../../../core/services/driver-portal.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { DriverPortalNavComponent } from '../../components/driver-portal-nav/driver-portal-nav.component';
import { VEHICLE_CONDITIONS } from '../../constants/driver-portal.constants';

@Component({
  selector: 'app-driver-vehicle',
  imports: [
    FormsModule,
    PageHeaderComponent,
    DriverPortalNavComponent,
    StatusBadgeComponent,
    DecimalPipe,
  ],
  templateUrl: './driver-vehicle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverVehicleComponent implements OnInit {
  private readonly portal = inject(DriverPortalService);
  private readonly notification = inject(NotificationService);

  readonly dashboard = signal<DriverDashboard | null>(null);
  readonly saving = signal(false);
  readonly conditions = VEHICLE_CONDITIONS;

  condition = 'GOOD';
  notes = '';
  odometer = 0;

  ngOnInit(): void {
    this.portal.getDashboard().subscribe({
      next: (d) => {
        this.dashboard.set(d);
        if (d.current_vehicle) this.odometer = d.current_vehicle.odometer_reading;
      },
    });
  }

  submit(): void {
    const v = this.dashboard()?.current_vehicle;
    if (!v) {
      this.notification.error('No vehicle assigned.');
      return;
    }
    this.saving.set(true);
    this.portal
      .reportVehicleCondition({
        vehicle: v.id,
        condition: this.condition as 'GOOD',
        notes: this.notes,
        odometer_reading: this.odometer,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Vehicle condition reported');
          this.notes = '';
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
