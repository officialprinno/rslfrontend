import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { CorrectiveAction, SafetyIncident } from '../../../../core/models/safety.model';
import { EmployeeListItem } from '../../../../core/models/hr.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SafetyService } from '../../../../core/services/safety.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDateTime } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { WorkflowStepperComponent } from '../../../procurement/components/workflow-stepper/workflow-stepper.component';
import { SafetyNavComponent } from '../../components/safety-nav/safety-nav.component';
import {
  INCIDENT_STATUS_COLORS,
  INCIDENT_TYPE_COLORS,
  INCIDENT_WORKFLOW_STEPS,
  SEVERITY_COLORS,
  incidentTypeLabel,
} from '../../constants/safety.constants';
import {
  canCloseIncident,
  canInvestigateIncident,
} from '../../utils/safety-permissions.util';

type ViewTab = 'details' | 'investigation' | 'corrective' | 'closure';

@Component({
  selector: 'app-incident-view',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SafetyNavComponent,
    WorkflowStepperComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
  ],
  templateUrl: './incident-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly safety = inject(SafetyService);
  private readonly hr = inject(HrService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  readonly incident = signal<SafetyIncident | null>(null);
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly saving = signal(false);
  readonly activeTab = signal<ViewTab>('details');

  readonly formatDateTime = formatDateTime;
  readonly incidentTypeLabel = incidentTypeLabel;
  readonly workflowSteps = INCIDENT_WORKFLOW_STEPS;
  readonly typeColor = (t: string) => INCIDENT_TYPE_COLORS[t] ?? 'badge-gray';
  readonly severityColor = (s: string) => SEVERITY_COLORS[s as keyof typeof SEVERITY_COLORS] ?? 'badge-gray';
  readonly statusColor = (s: string) => INCIDENT_STATUS_COLORS[s] ?? 'badge-gray';

  readonly canInvestigate = () => canInvestigateIncident(this.auth);
  readonly canClose = () => canCloseIncident(this.auth);

  readonly tabs: { id: ViewTab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'investigation', label: 'Investigation' },
    { id: 'corrective', label: 'Corrective Actions' },
    { id: 'closure', label: 'Closure' },
  ];

  readonly workflowIndex = computed(() => {
    const status = this.incident()?.status;
    const map: Record<string, number> = {
      DRAFT: 0,
      OPEN: 1,
      INVESTIGATING: 2,
      CLOSED: 3,
    };
    return map[status ?? ''] ?? 0;
  });

  readonly correctiveForm = this.fb.group({
    action: ['', Validators.required],
    assigned_to: [null as number | null],
    due_date: ['', Validators.required],
    priority: ['MEDIUM' as CorrectiveAction['priority'], Validators.required],
  });

  readonly closureForm = this.fb.group({
    lessons_learned: ['', [Validators.required, Validators.minLength(20)]],
    prevention_measures: [''],
  });

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab') as ViewTab | null;
    if (tab && this.tabs.some((t) => t.id === tab)) {
      this.activeTab.set(tab);
    }
    this.hr.getEmployees({ page_size: 200, status: 'ACTIVE' }).subscribe((d) => {
      this.employees.set(d.results);
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.safety
      .getIncident(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (inc) => {
          this.incident.set(inc);
          if (inc.lessons_learned) {
            this.closureForm.patchValue({
              lessons_learned: inc.lessons_learned,
              prevention_measures: inc.prevention_measures ?? '',
            });
          }
        },
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  setTab(tab: ViewTab): void {
    this.activeTab.set(tab);
  }

  startInvestigation(): void {
    const inc = this.incident();
    if (!inc) return;
    this.confirm
      .open({
        title: 'Start Investigation',
        message: `Begin formal investigation for ${inc.incident_number}?`,
        confirmLabel: 'Start Investigation',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.saving.set(true);
        this.safety
          .startInvestigation(inc.id)
          .pipe(finalize(() => this.saving.set(false)))
          .subscribe({
            next: (updated) => {
              this.incident.set(updated);
              this.notification.success('Investigation started');
              this.activeTab.set('investigation');
            },
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
      });
  }

  addCorrectiveAction(): void {
    const inc = this.incident();
    if (!inc || this.correctiveForm.invalid) {
      this.correctiveForm.markAllAsTouched();
      return;
    }
    const raw = this.correctiveForm.getRawValue();
    this.saving.set(true);
    this.safety
      .addCorrectiveAction(inc.id, {
        action: raw.action!,
        assigned_to: raw.assigned_to ?? undefined,
        due_date: raw.due_date!,
        priority: raw.priority!,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Corrective action added');
          this.correctiveForm.reset({ priority: 'MEDIUM' });
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  markActionDone(action: CorrectiveAction): void {
    const inc = this.incident();
    if (!inc) return;
    this.safety.updateCorrectiveAction(inc.id, action.id, { status: 'DONE' }).subscribe({
      next: () => {
        this.notification.success('Action marked as done');
        this.load();
      },
      error: (e) => this.notification.error(getApiErrorMessage(e)),
    });
  }

  closeIncident(): void {
    const inc = this.incident();
    if (!inc || this.closureForm.invalid) {
      this.closureForm.markAllAsTouched();
      return;
    }
    const raw = this.closureForm.getRawValue();
    this.confirm
      .open({
        title: 'Close Incident',
        message: `Close incident ${inc.incident_number}? This action cannot be undone.`,
        confirmLabel: 'Close Incident',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.saving.set(true);
        this.safety
          .closeIncident(inc.id, {
            lessons_learned: raw.lessons_learned!,
            prevention_measures: raw.prevention_measures || undefined,
          })
          .pipe(finalize(() => this.saving.set(false)))
          .subscribe({
            next: (updated) => {
              this.incident.set(updated);
              this.notification.success('Incident closed');
            },
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
      });
  }
}
