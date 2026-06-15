import {

  ChangeDetectionStrategy,

  Component,

  computed,

  inject,

  OnInit,

  signal,

} from '@angular/core';

import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { finalize } from 'rxjs/operators';



import {
  PermitChecklistItem,
  PermitType,
  PermitWorker,
  WorkPermitFormData,
} from '../../../../core/models/safety.model';

import { Department } from '../../../../core/models/procurement.model';

import { DepartmentsService } from '../../../../core/services/departments.service';

import { NotificationService } from '../../../../core/services/notification.service';

import { SafetyService } from '../../../../core/services/safety.service';

import { getApiErrorMessage } from '../../../../core/utils/api.util';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

import { SafetyNavComponent } from '../../components/safety-nav/safety-nav.component';

import {

  HAZARDS,

  LOCATIONS,

  PERMIT_CHECKLISTS,

  PERMIT_TYPES,

  RISK_CONSEQUENCE_LABELS,

  RISK_LIKELIHOOD_LABELS,

  riskMatrixCellClass,

  riskScoreToLevel,

} from '../../constants/safety.constants';



@Component({

  selector: 'app-permit-form',

  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, SafetyNavComponent],

  templateUrl: './permit-form.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class PermitFormComponent implements OnInit {

  private readonly fb = inject(FormBuilder);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly safety = inject(SafetyService);

  private readonly departments = inject(DepartmentsService);

  private readonly notification = inject(NotificationService);



  readonly deptOptions = signal<Department[]>([]);

  readonly saving = signal(false);

  readonly editId = signal<number | null>(null);

  readonly likelihood = signal(1);

  readonly consequence = signal(1);



  readonly permitTypes = PERMIT_TYPES;

  readonly locations = LOCATIONS;

  readonly hazards = HAZARDS;

  readonly likelihoodLabels = RISK_LIKELIHOOD_LABELS;

  readonly consequenceLabels = RISK_CONSEQUENCE_LABELS;

  readonly riskMatrixCellClass = riskMatrixCellClass;



  readonly riskScore = computed(() => this.likelihood() * this.consequence());

  readonly riskLevel = computed(() => riskScoreToLevel(this.riskScore()));



  readonly form = this.fb.group({

    permit_type: ['GENERAL' as PermitType, Validators.required],

    work_description: ['', [Validators.required, Validators.minLength(20)]],

    location: ['', Validators.required],

    department: [null as number | null],

    equipment_tools: [''],

    valid_from: ['', Validators.required],

    valid_until: ['', Validators.required],

    hazards: [[] as string[]],

    control_measures: ['', Validators.required],

    workers: this.fb.array([this.createWorkerGroup()]),

    safety_checklist: this.fb.array([]),

  });



  get workers(): FormArray {

    return this.form.get('workers') as FormArray;

  }



  get checklist(): FormArray {

    return this.form.get('safety_checklist') as FormArray;

  }



  ngOnInit(): void {

    this.departments.getDepartments().subscribe((d) => this.deptOptions.set(d));

    this.loadChecklistForType(this.form.get('permit_type')!.value as PermitType);



    const id = this.route.snapshot.paramMap.get('id');

    if (id) {

      this.editId.set(+id);

      this.safety.getWorkPermit(+id).subscribe({

        next: (permit) => {

          if (permit.status !== 'PENDING') {

            this.notification.error('Only pending permits can be edited');

            this.router.navigate(['/safety/permits', permit.id, 'view']);

            return;

          }

          this.patchForm(permit);

        },

        error: (e) => this.notification.error(getApiErrorMessage(e)),

      });

    }



    this.form.get('permit_type')!.valueChanges.subscribe((type) => {

      if (type) this.loadChecklistForType(type as PermitType);

    });

  }



  createWorkerGroup(name = '', id = '') {

    return this.fb.group({

      name: [name, Validators.required],

      id: [id, Validators.required],

    });

  }



  addWorker(): void {

    this.workers.push(this.createWorkerGroup());

  }



  removeWorker(index: number): void {

    if (this.workers.length > 1) this.workers.removeAt(index);

  }



  loadChecklistForType(type: PermitType): void {

    while (this.checklist.length) this.checklist.removeAt(0);

    const items = PERMIT_CHECKLISTS[type] ?? [];

    for (const item of items) {

      this.checklist.push(

        this.fb.group({

          item: [item],

          checked: [false],

        }),

      );

    }

  }



  toggleHazard(hazard: string): void {

    const current = [...(this.form.get('hazards')!.value as string[])];

    const idx = current.indexOf(hazard);

    if (idx >= 0) current.splice(idx, 1);

    else current.push(hazard);

    this.form.patchValue({ hazards: current });

  }



  isHazardSelected(hazard: string): boolean {

    return (this.form.get('hazards')!.value as string[]).includes(hazard);

  }



  selectRiskCell(l: number, c: number): void {

    this.likelihood.set(l);

    this.consequence.set(c);

  }



  isRiskCellSelected(l: number, c: number): boolean {

    return this.likelihood() === l && this.consequence() === c;

  }



  save(submit = false): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      this.notification.error('Please complete all required fields');

      return;

    }



    const raw = this.form.getRawValue();

    const payload: WorkPermitFormData = {

      permit_type: raw.permit_type!,

      work_description: raw.work_description!,

      location: raw.location!,

      department: raw.department,

      workers: (raw.workers ?? []).map((w) => ({
        name: w.name ?? '',
        id: w.id ?? '',
      })) as PermitWorker[],

      equipment_tools: raw.equipment_tools || undefined,

      valid_from: raw.valid_from!,

      valid_until: raw.valid_until!,

      hazards: raw.hazards ?? [],

      risk_level: this.riskLevel(),

      control_measures: raw.control_measures!,

      safety_checklist: (raw.safety_checklist ?? []) as PermitChecklistItem[],

    };



    this.saving.set(true);

    const id = this.editId();

    const req = id

      ? this.safety.updateWorkPermit(id, payload)

      : this.safety.createWorkPermit(payload);



    req.pipe(finalize(() => this.saving.set(false))).subscribe({

      next: (permit) => {

        if (submit) {

          this.safety.submitPermit(permit.id).subscribe({

            next: () => {

              this.notification.success('Permit submitted for approval');

              this.router.navigate(['/safety/permits', permit.id, 'view']);

            },

            error: (e) => this.notification.error(getApiErrorMessage(e)),

          });

        } else {

          this.notification.success(id ? 'Permit updated' : 'Permit saved as draft');

          this.router.navigate(['/safety/permits', permit.id, 'view']);

        }

      },

      error: (e) => this.notification.error(getApiErrorMessage(e)),

    });

  }



  private patchForm(permit: {

    permit_type: PermitType;

    work_description: string;

    location: string;

    department?: number | null;

    equipment_tools?: string;

    valid_from: string;

    valid_until: string;

    hazards: string[];

    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';

    control_measures: string;

    workers: { name: string; id: string }[];

    safety_checklist: { item: string; checked: boolean }[];

  }): void {

    this.form.patchValue({

      permit_type: permit.permit_type,

      work_description: permit.work_description,

      location: permit.location,

      department: permit.department ?? null,

      equipment_tools: permit.equipment_tools ?? '',

      valid_from: permit.valid_from.slice(0, 16),

      valid_until: permit.valid_until.slice(0, 16),

      hazards: permit.hazards,

      control_measures: permit.control_measures,

    });



    while (this.workers.length) this.workers.removeAt(0);

    for (const w of permit.workers) {

      this.workers.push(this.createWorkerGroup(w.name, w.id));

    }

    if (!this.workers.length) this.workers.push(this.createWorkerGroup());



    while (this.checklist.length) this.checklist.removeAt(0);

    for (const item of permit.safety_checklist) {

      this.checklist.push(

        this.fb.group({

          item: [item.item],

          checked: [item.checked],

        }),

      );

    }



    const riskMap = { LOW: [1, 2], MEDIUM: [2, 3], HIGH: [4, 4] } as const;

    const [l, c] = riskMap[permit.risk_level];

    this.likelihood.set(l);

    this.consequence.set(c);

  }

}


