import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DashboardTableColumn } from '../../models/dashboard.types';

@Component({
  selector: 'app-dashboard-table',
  imports: [RouterLink],
  template: `
    <div class="dash-table-wrap table-container">
      <table class="enterprise-table w-full dash-table">
        <thead>
          <tr>
            @for (col of columns(); track col.key) {
              <th
                class="table-th"
                [class.text-right]="col.align === 'right'"
                [class.text-center]="col.align === 'center'"
              >
                {{ col.label }}
              </th>
            }
            @if (rowLink()) {
              <th class="table-th w-10"><span class="sr-only">Actions</span></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track trackRow($index, row)) {
            <tr class="table-row">
              @for (col of columns(); track col.key) {
                <td
                  class="table-td"
                  [class.text-right]="col.align === 'right'"
                  [class.text-center]="col.align === 'center'"
                  [class.font-mono]="col.mono"
                >
                  {{ cellValue(row, col.key) }}
                </td>
              }
              @if (rowLink(); as linkFn) {
                <td class="table-td text-right">
                  <a [routerLink]="linkFn(row)" class="dash-table__link">View</a>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
    @if (!rows().length) {
      <p class="dash-table__empty">{{ emptyMessage() }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardTableComponent<T extends Record<string, unknown>> {
  readonly columns = input.required<DashboardTableColumn<T>[]>();
  readonly rows = input<T[]>([]);
  readonly rowLink = input<((row: T) => string | string[]) | undefined>(undefined);
  readonly trackByKey = input<string>('id');
  readonly emptyMessage = input('No records to display.');

  trackRow(index: number, row: T): string | number {
    const key = this.trackByKey();
    const value = row[key];
    return typeof value === 'string' || typeof value === 'number' ? value : index;
  }

  cellValue(row: T, key: string): string {
    const value = row[key];
    if (value === null || value === undefined) return '—';
    return String(value);
  }
}
