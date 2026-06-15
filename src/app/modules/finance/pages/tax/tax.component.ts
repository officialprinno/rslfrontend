import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  NSSFSummary,
  PAYESummary,
  TaxSetting,
  VATSummary,
} from '../../../../core/models/finance.model';
import { FinanceService } from '../../../../core/services/finance.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import {
  exportNSSFSummaryPdf,
  exportPAYESummaryPdf,
  exportVATSummaryPdf,
} from '../../../../core/utils/finance-pdf.util';
import { formatAccountingAmount } from '../../constants/finance.constants';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';

type TaxTab = 'vat' | 'paye' | 'nssf' | 'settings';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

@Component({
  selector: 'app-finance-tax',
  imports: [
    JsonPipe,
    FormsModule,
    PageHeaderComponent,
    FinanceNavComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
  ],
  templateUrl: './tax.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxComponent implements OnInit {
  private readonly finance = inject(FinanceService);
  private readonly notification = inject(NotificationService);

  readonly activeTab = signal<TaxTab>('vat');
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly savingSettingId = signal<number | null>(null);

  readonly vatSummary = signal<VATSummary | null>(null);
  readonly payeSummary = signal<PAYESummary | null>(null);
  readonly nssfSummary = signal<NSSFSummary | null>(null);
  readonly taxSettings = signal<TaxSetting[]>([]);

  readonly months = MONTHS;
  readonly formatAmount = formatAccountingAmount;

  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();

  readonly tabs: { id: TaxTab; label: string }[] = [
    { id: 'vat', label: 'VAT Returns' },
    { id: 'paye', label: 'PAYE Summary' },
    { id: 'nssf', label: 'NSSF Summary' },
    { id: 'settings', label: 'Tax Settings' },
  ];

  readonly years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  ngOnInit(): void {
    this.loadActiveTab();
  }

  setTab(tab: TaxTab): void {
    this.activeTab.set(tab);
    this.loadActiveTab();
  }

  onPeriodChange(): void {
    if (this.activeTab() !== 'settings') {
      this.loadActiveTab();
    }
  }

  loadActiveTab(): void {
    const tab = this.activeTab();
    if (tab === 'vat') this.loadVAT();
    else if (tab === 'paye') this.loadPAYE();
    else if (tab === 'nssf') this.loadNSSF();
    else this.loadSettings();
  }

  loadVAT(): void {
    this.loading.set(true);
    this.error.set(false);
    this.finance
      .getVATSummary(this.month, this.year)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.vatSummary.set(data),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  loadPAYE(): void {
    this.loading.set(true);
    this.error.set(false);
    this.finance
      .getPAYESummary(this.month, this.year)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.payeSummary.set(data),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  loadNSSF(): void {
    this.loading.set(true);
    this.error.set(false);
    this.finance
      .getNSSFSummary(this.month, this.year)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.nssfSummary.set(data),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  loadSettings(): void {
    this.loading.set(true);
    this.error.set(false);
    this.finance
      .getTaxSettings()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.taxSettings.set(data),
        error: (e) => {
          this.error.set(true);
          this.notification.error(getApiErrorMessage(e));
        },
      });
  }

  exportActiveTab(): void {
    const tab = this.activeTab();
    if (tab === 'vat') {
      const data = this.vatSummary();
      if (data) exportVATSummaryPdf(data);
    } else if (tab === 'paye') {
      const data = this.payeSummary();
      if (data) exportPAYESummaryPdf(data);
    } else if (tab === 'nssf') {
      const data = this.nssfSummary();
      if (data) exportNSSFSummaryPdf(data);
    }
  }

  updateSetting(setting: TaxSetting, field: 'rate' | 'is_active', value: string | boolean): void {
    this.savingSettingId.set(setting.id);
    const payload: Partial<TaxSetting> =
      field === 'rate' ? { rate: String(value) } : { is_active: Boolean(value) };

    this.finance
      .updateTaxSetting(setting.id, payload)
      .pipe(finalize(() => this.savingSettingId.set(null)))
      .subscribe({
        next: (updated) => {
          this.taxSettings.update((list) =>
            list.map((s) => (s.id === updated.id ? updated : s)),
          );
          this.notification.success('Tax setting updated');
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  periodLabel(): string {
    const m = this.months.find((item) => item.value === this.month);
    return `${m?.label ?? this.month} ${this.year}`;
  }
}
