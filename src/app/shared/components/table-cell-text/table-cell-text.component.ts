import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-table-cell-text',
  template: `
    <span class="table-cell-text" [class.table-cell-text--medium]="weight() === 'medium'" [attr.title]="value() || '—'">
      {{ display() }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableCellTextComponent {
  readonly value = input<string | number | null | undefined>('');
  readonly weight = input<'normal' | 'medium'>('normal');

  display(): string {
    const v = this.value();
    if (v === null || v === undefined || v === '') return '—';
    return String(v);
  }
}
