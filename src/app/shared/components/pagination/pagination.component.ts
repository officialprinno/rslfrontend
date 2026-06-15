import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-pagination',
  imports: [TranslatePipe],
  template: `
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-[var(--border-color)]">
      <div class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <span>{{ 'common.rows_per_page' | translate }}</span>
        <select
          class="input-field !w-auto !py-1.5 !px-2 text-sm"
          [value]="pageSize()"
          (change)="onPageSizeChange($event)"
        >
          @for (size of pageSizes; track size) {
            <option [value]="size">{{ size }}</option>
          }
        </select>
        <span class="ml-2">
          {{ 'common.range_of' | translate: { start: rangeStart(), end: rangeEnd(), total: total() } }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn-secondary !px-3 !py-1.5 !text-sm"
          [disabled]="page() <= 1"
          (click)="pageChange.emit(page() - 1)"
        >
          {{ 'common.previous' | translate }}
        </button>
        <span class="text-sm text-[var(--text-secondary)] px-2">
          {{ 'common.page_of' | translate: { current: page(), total: totalPages() } }}
        </span>
        <button
          type="button"
          class="btn-secondary !px-3 !py-1.5 !text-sm"
          [disabled]="page() >= totalPages()"
          (click)="pageChange.emit(page() + 1)"
        >
          {{ 'common.next' | translate }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  readonly page = input(1);
  readonly pageSize = input(10);
  readonly total = input(0);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  readonly pageSizes = [10, 25, 50];

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly rangeStart = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );
  readonly rangeEnd = computed(() =>
    Math.min(this.page() * this.pageSize(), this.total()),
  );

  onPageSizeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSizeChange.emit(value);
  }
}
