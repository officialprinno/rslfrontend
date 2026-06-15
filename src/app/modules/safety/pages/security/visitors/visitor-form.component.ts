import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { SecurityLocation } from '../../../../../core/models/security.model';
import { HrService } from '../../../../../core/services/hr.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { SecurityService } from '../../../../../core/services/security.service';
import { getApiErrorMessage } from '../../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { SecurityNavComponent } from '../../../components/security-nav/security-nav.component';
import { VISITOR_PURPOSES } from '../../../constants/security.constants';

@Component({
  selector: 'app-visitor-form',
  imports: [FormsModule, RouterLink, PageHeaderComponent, SecurityNavComponent],
  templateUrl: './visitor-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisitorFormComponent implements OnInit {
  private readonly security = inject(SecurityService);
  private readonly hr = inject(HrService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  readonly locations = signal<SecurityLocation[]>([]);
  readonly employees = signal<{ id: number; full_name: string; department_name: string }[]>([]);
  readonly saving = signal(false);
  readonly purposes = VISITOR_PURPOSES;

  form = {
    full_name: '',
    id_type: 'NATIONAL_ID',
    id_number: '',
    phone: '',
    company: '',
    email: '',
    purpose: 'MEETING',
    host_employee: 0,
    location: 0,
    expected_time_in: new Date().toISOString().slice(0, 16),
    duration_hours: 2,
    vehicle_registration: '',
    notes: '',
    pre_approved: false,
  };

  ngOnInit(): void {
    this.security.getLocations().subscribe((l) => {
      this.locations.set(l);
      if (l.length) this.form.location = l[0].id;
    });
    this.hr.getEmployees({ page_size: 100 }).subscribe((d) => {
      this.employees.set(
        d.results.map((e) => ({
          id: e.id,
          full_name: e.full_name,
          department_name: e.department_name,
        })),
      );
    });
  }

  expectedOut(): string {
    const start = new Date(this.form.expected_time_in);
    start.setHours(start.getHours() + this.form.duration_hours);
    return start.toISOString();
  }

  save(): void {
    if (!this.form.full_name || !this.form.host_employee) {
      this.notification.error('Fill required fields');
      return;
    }
    this.saving.set(true);
    this.security
      .registerVisitor({
        ...this.form,
        expected_time_out: this.expectedOut(),
        items_brought: [],
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (v) => {
          this.notification.success('Visitor registered');
          void this.router.navigate(['/safety/security/visitors']);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
