import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { UserOption } from '../../../../core/models/inventory.model';
import {
  OutputRecord,
  QCFormData,
  Shift,
  WorkOrder,
} from '../../../../core/models/production.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductionService } from '../../../../core/services/production.service';
import { UsersService } from '../../../../core/services/users.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProductionNavComponent } from '../../components/production-nav/production-nav.component';
import { SHIFTS } from '../../constants/production.constants';
import { canQCCheck, canRecordOutput } from '../../utils/production-permissions.util';

@Component({
  selector: 'app-output-list',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    ProductionNavComponent,
    PaginationComponent,
    ModalComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './output-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OutputListComponent implements OnInit {
  private readonly production = inject(ProductionService);
  private readonly users = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly records = signal<OutputRecord[]>([]);
  readonly workOrders = signal<WorkOrder[]>([]);
  readonly operators = signal<UserOption[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly woFilter = signal<number | ''>('');
  readonly showRecord = signal(false);
  readonly showQc = signal(false);
  readonly qcRecord = signal<OutputRecord | null>(null);

  readonly shifts = SHIFTS;
  readonly formatDate = formatDate;
  readonly canRecord = () => canRecordOutput(this.auth);
  readonly canQc = () => canQCCheck(this.auth);

  readonly recordForm = this.fb.group({
    work_order: [null as number | null, Validators.required],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    shift: ['MORNING' as Shift, Validators.required],
    quantity_produced: [0, [Validators.required, Validators.min(0)]],
    quantity_rejected: [0, [Validators.required, Validators.min(0)]],
    rejection_reason: [''],
    operator: [null as number | null, Validators.required],
    notes: [''],
  });

  readonly qcForm = this.fb.group({
    qc_result: ['PASS' as QCFormData['qc_result'], Validators.required],
    qc_notes: [''],
    rejection_reason: [''],
  });

  readonly rejectionRatePreview = computed(() => {
    const raw = this.recordFormValue();
    const produced = Number(raw.quantity_produced);
    const rejected = Number(raw.quantity_rejected);
    const total = produced + rejected;
    if (total <= 0) return 0;
    return Math.round((rejected / total) * 1000) / 10;
  });

  private readonly recordFormValue = signal(this.recordForm.getRawValue());

  ngOnInit(): void {
    this.recordForm.valueChanges.subscribe(() =>
      this.recordFormValue.set(this.recordForm.getRawValue()),
    );
    this.production.getWorkOrders({ status: 'IN_PROGRESS', page_size: 100 }).subscribe((d) => this.workOrders.set(d.results));
    this.users.getUsers().subscribe((u) => this.operators.set(u));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 10,
      ordering: '-date',
    };
    if (this.search()) params['search'] = this.search();
    if (this.woFilter()) params['work_order'] = this.woFilter() as number;

    this.production
      .getOutputRecords(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.records.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  rejectionRate(rec: OutputRecord): number {
    const total = rec.quantity_produced + rec.quantity_rejected;
    if (total <= 0) return 0;
    return Math.round((rec.quantity_rejected / total) * 1000) / 10;
  }

  rejectionRateClass(rate: number): string {
    if (rate <= 5) return 'text-emerald-600 font-medium';
    if (rate <= 15) return 'text-amber-600 font-medium';
    return 'text-red-600 font-semibold';
  }

  shiftLabel(shift: Shift): string {
    return SHIFTS.find((s) => s.value === shift)?.label ?? shift;
  }

  openRecord(): void {
    this.recordForm.reset({
      date: new Date().toISOString().slice(0, 10),
      shift: 'MORNING',
      quantity_produced: 0,
      quantity_rejected: 0,
      rejection_reason: '',
      notes: '',
    });
    this.recordFormValue.set(this.recordForm.getRawValue());
    this.showRecord.set(true);
  }

  saveRecord(): void {
    if (this.recordForm.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.recordForm.getRawValue();
    if (Number(raw.quantity_rejected) > 0 && !raw.rejection_reason?.trim()) {
      this.notification.error('Rejection reason is required when quantity rejected > 0.');
      return;
    }
    this.saving.set(true);
    this.production
      .recordOutput({
        work_order: raw.work_order!,
        date: raw.date!,
        shift: raw.shift!,
        quantity_produced: Number(raw.quantity_produced),
        quantity_rejected: Number(raw.quantity_rejected),
        rejection_reason: raw.rejection_reason || undefined,
        operator: raw.operator!,
        notes: raw.notes ?? '',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Output recorded');
          this.showRecord.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openQc(rec: OutputRecord): void {
    this.qcRecord.set(rec);
    this.qcForm.reset({ qc_result: 'PASS', qc_notes: '', rejection_reason: rec.rejection_reason ?? '' });
    this.showQc.set(true);
  }

  saveQc(): void {
    const rec = this.qcRecord();
    if (!rec || this.qcForm.invalid) {
      this.notification.error('Complete QC details.');
      return;
    }
    const raw = this.qcForm.getRawValue();
    this.saving.set(true);
    this.production
      .performQCCheck(rec.id, {
        qc_result: raw.qc_result!,
        qc_notes: raw.qc_notes ?? '',
        rejection_reason: raw.rejection_reason || undefined,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('QC check recorded');
          this.showQc.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
