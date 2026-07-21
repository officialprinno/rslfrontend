import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { RecurringBill } from '../../../../core/models/finance.model';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate } from '../../../../core/utils/format.util';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { OpenFileComponent } from '../../../../shared/components/open-file/open-file.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';
import { RECURRING_BILL_FREQUENCIES, formatAccountingAmount } from '../../constants/finance.constants';

@Component({
  selector: 'app-recurring-bill-view',
  imports: [
    RouterLink,
    FinanceNavComponent,
    StatusBadgeComponent,
    OpenFileComponent,
  ],
  templateUrl: './recurring-bill-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringBillViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly finance = inject(FinanceService);
  private readonly notification = inject(NotificationService);

  readonly profile = signal<RecurringBill | null>(null);
  readonly loading = signal(true);
  readonly acting = signal(false);
  readonly uploadingProof = signal(false);

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatAccountingAmount = formatAccountingAmount;

  frequencyLabel(value: string): string {
    return RECURRING_BILL_FREQUENCIES.find((f) => f.value === value)?.label ?? value;
  }

  lineAmount(line: { quantity: number | string; rate: number | string }): number {
    return Number(line.quantity || 0) * Number(line.rate || 0);
  }

  profileTotal(p: RecurringBill): string {
    const total = p.lines.reduce((sum, line) => sum + this.lineAmount(line), 0);
    return this.formatAccountingAmount(total, p.currency_code);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.load(+id);
  }

  load(id: number): void {
    this.loading.set(true);
    this.finance
      .getRecurringBill(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (p) => this.profile.set(p),
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  pause(): void {
    const p = this.profile();
    if (!p) return;
    this.acting.set(true);
    this.finance
      .pauseRecurringBill(p.id)
      .pipe(finalize(() => this.acting.set(false)))
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.notification.success('Recurring profile paused');
        },
      });
  }

  resume(): void {
    const p = this.profile();
    if (!p) return;
    this.acting.set(true);
    this.finance
      .resumeRecurringBill(p.id)
      .pipe(finalize(() => this.acting.set(false)))
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.notification.success('Recurring profile resumed');
        },
      });
  }

  generateNow(): void {
    const p = this.profile();
    if (!p) return;
    this.acting.set(true);
    this.finance
      .generateRecurringBillNow(p.id)
      .pipe(finalize(() => this.acting.set(false)))
      .subscribe({
        next: ({ bill, profile }) => {
          this.profile.set(profile);
          this.notification.success(`Bill ${bill.bill_number} generated`);
          void this.router.navigate(['/finance/bills', bill.id, 'view']);
        },
      });
  }

  onPaymentProofSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const p = this.profile();
    if (!file || !p) return;
    input.value = '';
    this.uploadingProof.set(true);
    this.finance
      .uploadRecurringBillPaymentProof(p.id, file)
      .pipe(finalize(() => this.uploadingProof.set(false)))
      .subscribe({
        next: (updated) => {
          this.profile.set(updated);
          this.notification.success('Payment proof uploaded');
        },
      });
  }
}
