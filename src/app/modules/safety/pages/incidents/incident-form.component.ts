import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { EmployeeListItem } from '../../../../core/models/hr.model';
import {
  IncidentFormData,
  IncidentSeverity,
  IncidentType,
  SafetyIncident,
  Witness,
} from '../../../../core/models/safety.model';
import { Department } from '../../../../core/models/procurement.model';
import { DepartmentsService } from '../../../../core/services/departments.service';
import { HrService } from '../../../../core/services/hr.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SafetyService } from '../../../../core/services/safety.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { SafetyNavComponent } from '../../components/safety-nav/safety-nav.component';
import {
  BODY_PARTS,
  CONTRIBUTING_FACTORS,
  INCIDENT_SEVERITIES,
  INCIDENT_TYPES,
  LOCATIONS,
} from '../../constants/safety.constants';

@Component({
  selector: 'app-incident-form',
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, SafetyNavComponent],
  templateUrl: './incident-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncidentFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly safety = inject(SafetyService);
  private readonly hr = inject(HrService);
  private readonly departments = inject(DepartmentsService);
  private readonly notification = inject(NotificationService);

  readonly deptOptions = signal<Department[]>([]);
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly saving = signal(false);
  readonly editId = signal<number | null>(null);

  readonly incidentTypes = INCIDENT_TYPES;
  readonly severities = INCIDENT_SEVERITIES;
  readonly locations = LOCATIONS;
  readonly bodyParts = BODY_PARTS;
  readonly contributingFactors = CONTRIBUTING_FACTORS;

  readonly form = this.fb.group({
    incident_type: ['NEAR_MISS', Validators.required],
    severity: ['MEDIUM', Validators.required],
    date_occurred: ['', Validators.required],
    location: ['', Validators.required],
    department: [null as number | null],
    description: ['', [Validators.required, Validators.minLength(50)]],
    immediate_actions: [''],
    anyone_injured: [false],
    injured_person: [null as number | null],
    injury_description: [''],
    body_parts: [[] as string[]],
    medical_treatment_required: [false],
    hospitalized: [false],
    first_aid_given: [false],
    first_aid_provider: [''],
    photos: [[] as string[]],
    documents: [[] as string[]],
    cctv_reference: [''],
    immediate_cause: [''],
    contributing_factors: [[] as string[]],
    witnesses: this.fb.array([]),
  });

  get witnesses(): FormArray {
    return this.form.get('witnesses') as FormArray;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({
      departments: this.departments.getDepartments(),
      employees: this.hr.getEmployees({ page_size: 200, status: 'ACTIVE' }),
    }).subscribe(({ departments, employees }) => {
      this.deptOptions.set(departments);
      this.employees.set(employees.results);
    });

    if (id) {
      this.editId.set(+id);
      this.safety.getIncident(+id).subscribe({
        next: (inc) => {
          if (inc.status !== 'DRAFT') {
            this.notification.error('Only draft incidents can be edited');
            this.router.navigate(['/safety/incidents', inc.id, 'view']);
            return;
          }
          this.patchForm(inc);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
    }
  }

  addWitness(): void {
    this.witnesses.push(
      this.fb.group({
        name: ['', Validators.required],
        is_employee: [false],
        employee: [null as number | null],
        contact: [''],
        statement: [''],
      }),
    );
  }

  removeWitness(index: number): void {
    this.witnesses.removeAt(index);
  }

  toggleBodyPart(part: string): void {
    const current = [...(this.form.get('body_parts')?.value as string[] ?? [])];
    const idx = current.indexOf(part);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(part);
    this.form.patchValue({ body_parts: current });
  }

  isBodyPartSelected(part: string): boolean {
    return (this.form.get('body_parts')?.value as string[] ?? []).includes(part);
  }

  toggleFactor(factor: string): void {
    const current = [...(this.form.get('contributing_factors')?.value as string[] ?? [])];
    const idx = current.indexOf(factor);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(factor);
    this.form.patchValue({ contributing_factors: current });
  }

  isFactorSelected(factor: string): boolean {
    return (this.form.get('contributing_factors')?.value as string[] ?? []).includes(factor);
  }

  saveDraft(): void {
    this.save();
  }

  submitReport(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.error('Please complete all required fields (description min. 50 characters)');
      return;
    }
    this.save(true);
  }

  private save(submit = false): void {
    const raw = this.form.getRawValue();
    const data: IncidentFormData = {
      incident_type: raw.incident_type! as IncidentType,
      severity: raw.severity! as IncidentSeverity,
      date_occurred: raw.date_occurred!,
      location: raw.location!,
      department: raw.department,
      description: raw.description!,
      immediate_actions: raw.immediate_actions || undefined,
      anyone_injured: raw.anyone_injured ?? false,
      injured_person: raw.anyone_injured ? raw.injured_person : null,
      injury_description: raw.injury_description || undefined,
      body_parts: raw.body_parts?.length ? raw.body_parts : undefined,
      medical_treatment_required: raw.medical_treatment_required ?? false,
      hospitalized: raw.hospitalized ?? false,
      first_aid_given: raw.first_aid_given ?? false,
      first_aid_provider: raw.first_aid_provider || undefined,
      photos: raw.photos?.length ? raw.photos : undefined,
      documents: raw.documents?.length ? raw.documents : undefined,
      cctv_reference: raw.cctv_reference || undefined,
      immediate_cause: raw.immediate_cause || undefined,
      contributing_factors: raw.contributing_factors?.length ? raw.contributing_factors : undefined,
      witnesses: (raw.witnesses as Witness[] | undefined)?.map((w) => ({
        name: w.name,
        is_employee: w.is_employee ?? false,
        employee: w.is_employee ? w.employee : null,
        contact: w.contact || '',
        statement: w.statement || '',
      })),
      status: 'DRAFT',
    };

    this.saving.set(true);
    const id = this.editId();
    const req$ = id
      ? this.safety.updateIncident(id, data)
      : this.safety.createIncident(data);

    req$.subscribe({
      next: (inc) => {
        if (submit) {
          this.safety
            .submitIncident(inc.id)
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
              next: () => {
                this.notification.success('Incident report submitted');
                this.router.navigate(['/safety/incidents', inc.id, 'view']);
              },
              error: (e) => this.notification.error(getApiErrorMessage(e)),
            });
        } else {
          this.saving.set(false);
          this.notification.success('Draft saved');
          if (!id) {
            this.router.navigate(['/safety/incidents', inc.id, 'edit']);
          }
        }
      },
      error: (e) => {
        this.saving.set(false);
        this.notification.error(getApiErrorMessage(e));
      },
    });
  }

  private patchForm(inc: SafetyIncident): void {
    this.form.patchValue({
      incident_type: inc.incident_type,
      severity: inc.severity,
      date_occurred: inc.date_occurred?.slice(0, 16) ?? inc.date_occurred,
      location: inc.location,
      department: inc.department ?? inc.department_id ?? null,
      description: inc.description,
      immediate_actions: inc.immediate_actions,
      anyone_injured: inc.anyone_injured,
      injured_person: inc.injured_person,
      injury_description: inc.injury_description ?? '',
      body_parts: inc.body_parts ?? [],
      medical_treatment_required: inc.medical_treatment_required,
      hospitalized: inc.hospitalized,
      first_aid_given: inc.first_aid_given,
      first_aid_provider: inc.first_aid_provider ?? '',
      photos: inc.photos ?? [],
      documents: inc.documents ?? [],
      cctv_reference: inc.cctv_reference ?? '',
      immediate_cause: inc.immediate_cause ?? '',
      contributing_factors: inc.contributing_factors ?? [],
    });
    this.witnesses.clear();
    for (const w of inc.witnesses ?? []) {
      this.witnesses.push(
        this.fb.group({
          name: [w.name, Validators.required],
          is_employee: [w.is_employee],
          employee: [w.employee ?? null],
          contact: [w.contact],
          statement: [w.statement],
        }),
      );
    }
  }
}
