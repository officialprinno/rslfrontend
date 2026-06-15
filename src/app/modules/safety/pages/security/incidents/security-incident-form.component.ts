import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { SecurityIncident, SecurityLocation } from '../../../../../core/models/security.model';
import { NotificationService } from '../../../../../core/services/notification.service';
import { SecurityService } from '../../../../../core/services/security.service';
import { getApiErrorMessage } from '../../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../../shared/components/page-header/page-header.component';
import { SecurityNavComponent } from '../../../components/security-nav/security-nav.component';
import { SEC_INCIDENT_TYPES } from '../../../constants/security.constants';

@Component({
  selector: 'app-security-incident-form',
  imports: [FormsModule, PageHeaderComponent, SecurityNavComponent],
  template: `
    <app-page-header title="Report Security Incident" />
    <app-security-nav />
    <div class="card max-w-2xl space-y-4">
      <div class="grid sm:grid-cols-2 gap-3">
        <div>
          <label class="form-label">Incident Type *</label>
          <select class="input-field w-full" [(ngModel)]="form.incident_type">
            @for (t of types; track t) { <option [value]="t">{{ t }}</option> }
          </select>
        </div>
        <div>
          <label class="form-label">Severity *</label>
          <select class="input-field w-full" [(ngModel)]="form.severity">
            <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div>
          <label class="form-label">Location *</label>
          <select class="input-field w-full" [(ngModel)]="form.location">
            @for (l of locations(); track l.id) { <option [value]="l.id">{{ l.icon }} {{ l.name }}</option> }
          </select>
        </div>
        <div>
          <label class="form-label">Date & Time *</label>
          <input type="datetime-local" class="input-field w-full" [(ngModel)]="form.date_occurred" />
        </div>
      </div>
      <div>
        <label class="form-label">Description * (min 50 chars)</label>
        <textarea class="input-field w-full min-h-[120px]" [(ngModel)]="form.description"></textarea>
      </div>
      <div>
        <label class="form-label">Persons Involved</label>
        <textarea class="input-field w-full" rows="2" [(ngModel)]="form.persons_involved"></textarea>
      </div>
      <div>
        <label class="form-label">Immediate Actions</label>
        <textarea class="input-field w-full" rows="2" [(ngModel)]="form.immediate_actions"></textarea>
      </div>
      <div class="flex gap-2 justify-end">
        <button type="button" class="btn-primary" [disabled]="saving()" (click)="save()">Submit Report</button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityIncidentFormComponent implements OnInit {
  private readonly security = inject(SecurityService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  readonly locations = signal<SecurityLocation[]>([]);
  readonly saving = signal(false);
  readonly types = SEC_INCIDENT_TYPES;

  form: {
    incident_type: string;
    severity: SecurityIncident['severity'];
    location: number;
    date_occurred: string;
    description: string;
    persons_involved: string;
    immediate_actions: string;
    specific_area: string;
  } = {
    incident_type: 'SUSPICIOUS_ACTIVITY',
    severity: 'MEDIUM',
    location: 0,
    date_occurred: new Date().toISOString().slice(0, 16),
    description: '',
    persons_involved: '',
    immediate_actions: '',
    specific_area: '',
  };

  ngOnInit(): void {
    this.security.getLocations().subscribe((l) => {
      this.locations.set(l);
      if (l.length) this.form.location = l[0].id;
    });
  }

  save(): void {
    if (this.form.description.length < 50) {
      this.notification.error('Description must be at least 50 characters');
      return;
    }
    this.saving.set(true);
    this.security
      .reportIncident({ ...this.form, date_occurred: new Date(this.form.date_occurred).toISOString() })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Incident reported');
          void this.router.navigate(['/safety/security/incidents']);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
