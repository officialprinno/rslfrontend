import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { WorkPermit } from '../../../../core/models/safety.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SafetyService } from '../../../../core/services/safety.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDateTime } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SafetyNavComponent } from '../../components/safety-nav/safety-nav.component';
import {
  PERMIT_STATUS_COLORS,
  PERMIT_TYPE_COLORS,
  permitTypeLabel,
} from '../../constants/safety.constants';
import { canApprovePermit, canReportIncident } from '../../utils/safety-permissions.util';

@Component({
  selector: 'app-permit-view',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SafetyNavComponent,
    ModalComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
  ],
  templateUrl: './permit-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermitViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly safety = inject(SafetyService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly permit = signal<WorkPermit | null>(null);
  readonly loading = signal(true);
  readonly actionLoading = signal(false);
  readonly showExtend = signal(false);
  readonly extendUntil = signal('');

  readonly formatDateTime = formatDateTime;
  readonly permitTypeLabel = permitTypeLabel;
  readonly typeColor = (t: string) => PERMIT_TYPE_COLORS[t as keyof typeof PERMIT_TYPE_COLORS] ?? 'badge-gray';
  readonly statusColor = (s: string) => PERMIT_STATUS_COLORS[s] ?? 'badge-gray';
  readonly canApprove = () => canApprovePermit(this.auth);
  readonly canEdit = () => canReportIncident(this.auth);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/safety/permits']);
      return;
    }
    this.load(+id);
  }

  load(id: number): void {
    this.loading.set(true);
    this.safety
      .getWorkPermit(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => this.permit.set(p),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  print(): void {
    window.print();
  }

  approve(): void {
    const p = this.permit();
    if (!p) return;
    this.confirm
      .open({
        title: 'Approve Permit',
        message: `Approve permit ${p.permit_number}?`,
        confirmLabel: 'Approve',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.runAction(() => this.safety.approvePermit(p.id), 'Permit approved');
      });
  }

  cancelPermit(): void {
    const p = this.permit();
    if (!p) return;
    this.confirm
      .open({
        title: 'Cancel Permit',
        message: `Cancel permit ${p.permit_number}? This cannot be undone.`,
        confirmLabel: 'Cancel Permit',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.runAction(() => this.safety.cancelPermit(p.id), 'Permit cancelled');
      });
  }

  openExtend(): void {
    const p = this.permit();
    if (!p) return;
    this.extendUntil.set(p.valid_until.slice(0, 16));
    this.showExtend.set(true);
  }

  confirmExtend(): void {
    const p = this.permit();
    if (!p || !this.extendUntil()) return;
    this.showExtend.set(false);
    this.runAction(
      () => this.safety.extendPermit(p.id, this.extendUntil()),
      'Permit extended',
    );
  }

  private runAction(action: () => ReturnType<SafetyService['approvePermit']>, successMsg: string): void {
    this.actionLoading.set(true);
    action()
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (p) => {
          this.permit.set(p);
          this.notification.success(successMsg);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
