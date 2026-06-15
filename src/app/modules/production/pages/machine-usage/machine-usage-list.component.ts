import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { UserOption } from '../../../../core/models/inventory.model';
import { Machine, MachineUsage, WorkOrder } from '../../../../core/models/production.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductionService } from '../../../../core/services/production.service';
import { UsersService } from '../../../../core/services/users.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDate, formatDateTime } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProductionNavComponent } from '../../components/production-nav/production-nav.component';
import { canStartProduction } from '../../utils/production-permissions.util';

@Component({
  selector: 'app-machine-usage-list',
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
  ],
  templateUrl: './machine-usage-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MachineUsageListComponent implements OnInit {
  private readonly production = inject(ProductionService);
  private readonly users = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly records = signal<MachineUsage[]>([]);
  readonly machines = signal<Machine[]>([]);
  readonly workOrders = signal<WorkOrder[]>([]);
  readonly operators = signal<UserOption[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly machineFilter = signal<number | ''>('');
  readonly showLog = signal(false);

  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly canLog = () => canStartProduction(this.auth);

  readonly logForm = this.fb.group({
    machine: [null as number | null, Validators.required],
    work_order: [null as number | null, Validators.required],
    operator: [null as number | null, Validators.required],
    start_time: ['', Validators.required],
    end_time: ['', Validators.required],
    hours_used: [{ value: 0, disabled: true }, Validators.required],
    notes: [''],
  });

  readonly hoursPreview = computed(() => {
    const raw = this.logFormValue();
    return this.calcHours(raw.start_time ?? '', raw.end_time ?? '');
  });

  private readonly logFormValue = signal(this.logForm.getRawValue());

  ngOnInit(): void {
    this.logForm.valueChanges.subscribe(() => {
      const raw = this.logForm.getRawValue();
      this.logFormValue.set(raw);
      const hours = this.calcHours(raw.start_time ?? '', raw.end_time ?? '');
      this.logForm.patchValue({ hours_used: hours }, { emitEvent: false });
    });
    this.production.getMachines({ page_size: 100, is_active: true }).subscribe((d) => this.machines.set(d.results));
    this.production.getWorkOrders({ status: 'IN_PROGRESS', page_size: 100 }).subscribe((d) => this.workOrders.set(d.results));
    this.users.getUsers().subscribe((u) => this.operators.set(u));
    this.load();
  }

  calcHours(start: string, end: string): number {
    if (!start || !end) return 0;
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return 0;
    return Math.round(((endMs - startMs) / (1000 * 60 * 60)) * 100) / 100;
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: 10,
      ordering: '-start_time',
    };
    if (this.search()) params['search'] = this.search();
    if (this.machineFilter()) params['machine'] = this.machineFilter() as number;

    this.production
      .getMachineUsage(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.records.set(d.results);
          this.total.set(d.count);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  openLog(): void {
    const now = new Date();
    const start = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    this.logForm.reset({
      start_time: this.toDatetimeLocal(start),
      end_time: this.toDatetimeLocal(now),
      hours_used: 2,
      notes: '',
    });
    this.logFormValue.set(this.logForm.getRawValue());
    this.showLog.set(true);
  }

  private toDatetimeLocal(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  saveLog(): void {
    if (this.logForm.invalid) {
      this.notification.error('Complete all required fields.');
      return;
    }
    const raw = this.logForm.getRawValue();
    const hours = this.calcHours(raw.start_time ?? '', raw.end_time ?? '');
    if (hours <= 0) {
      this.notification.error('End time must be after start time.');
      return;
    }
    this.saving.set(true);
    this.production
      .logMachineUsage({
        machine: raw.machine!,
        work_order: raw.work_order!,
        operator: raw.operator!,
        start_time: raw.start_time!,
        end_time: raw.end_time!,
        hours_used: hours,
        notes: raw.notes ?? '',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Machine usage logged');
          this.showLog.set(false);
          this.load();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
