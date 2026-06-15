import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-table-skeleton',
  template: `
    <div class="table-container animate-pulse">
      <div class="px-6 py-4 border-b border-gray-100">
        <div class="h-5 bg-gray-200 rounded w-48"></div>
      </div>
      @for (row of rowsArray(); track row) {
        <div class="flex gap-4 px-6 py-4 border-b border-gray-50">
          @for (col of colsArray(); track col) {
            <div class="h-4 bg-gray-100 rounded flex-1"></div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableSkeletonComponent {
  readonly rows = input(5);
  readonly cols = input(6);

  rowsArray(): number[] {
    return Array.from({ length: this.rows() }, (_, i) => i);
  }

  colsArray(): number[] {
    return Array.from({ length: this.cols() }, (_, i) => i);
  }
}
