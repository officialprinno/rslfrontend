import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { QuotationDocument } from '../../../../core/models/sales.model';
import { formatCurrency } from '../../../../core/utils/format.util';
import { QrCodeComponent } from '../../../../shared/components/qr-code/qr-code.component';

@Component({
  selector: 'app-quotation-document',
  imports: [QrCodeComponent],
  templateUrl: './quotation-document.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationDocumentComponent {
  readonly document = input.required<QuotationDocument>();
  readonly showAcceptance = input(true);

  readonly formatCurrency = formatCurrency;

  readonly currency = computed(() => this.document().meta.currency || 'TZS');

  readonly dimColumns = computed(() => {
    const labels: Record<string, string> = {
      length: 'LENGTH',
      width: 'WIDTH',
      height: 'HEIGHT',
      thickness: 'THICK',
      diameter: 'DIA',
    };
    const keys = ['length', 'width', 'height', 'thickness', 'diameter'] as const;
    return keys
      .filter((key) => this.document().lines.some((line) => this.hasValue(line[key])))
      .map((key) => ({ key, label: labels[key] }));
  });

  readonly showWeight = computed(() =>
    this.document().lines.some((line) => this.hasValue(line.weight_per_unit)),
  );

  readonly totalWeight = computed(() => this.document().financials.total_weight);

  readonly totalWeightUnit = computed(
    () => this.document().financials.total_weight_unit || 'Kg',
  );

  readonly bankAccounts = computed(() => this.document().bank_accounts.slice(0, 3));

  readonly termsLines = computed(() =>
    this.document()
      .terms.split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  );

  money(value: string | number | null | undefined): string {
    return formatCurrency(Number(value ?? 0), this.currency());
  }

  display(value: string | null | undefined): string {
    return value?.trim() ? value : '—';
  }

  hasValue(value: string | number | null | undefined): boolean {
    return value !== null && value !== undefined && value !== '';
  }

  formatDim(value: string | number | null | undefined, unit?: string): string {
    if (!this.hasValue(value)) return '—';
    const u = unit?.trim() || '';
    return u ? `${value} ${u}` : String(value);
  }

  lineDim(
    line: QuotationDocument['lines'][number],
    key: 'length' | 'width' | 'height' | 'thickness' | 'diameter',
  ): string | number | null | undefined {
    return line[key];
  }

  hasFinancial(value: string | number | null | undefined): boolean {
    return Number(value ?? 0) !== 0;
  }

  cleanTerm(term: string): string {
    return term.replace(/^\d+\.\s*/, '');
  }
}
