import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-table-skeleton',
  template: `
    <div class="card card--scroll-body enterprise-data-table-card">
      <div class="enterprise-card-accent" aria-hidden="true"></div>
      <div class="card-scroll-head enterprise-card-head">
        <div class="enterprise-card-head__main">
          <div class="h-5 bg-gray-200 rounded w-40 animate-pulse"></div>
          <div class="h-3 bg-gray-100 rounded w-56 mt-2 animate-pulse"></div>
        </div>
        <div class="h-6 bg-gray-100 rounded-full w-20 animate-pulse"></div>
      </div>
      <div class="card-scroll-host">
        <div class="table-container enterprise-table-container animate-pulse">
          <div class="table-scroll-viewport enterprise-table-viewport">
            <table class="enterprise-table w-full">
              <thead>
                <tr>
                  @for (col of colsArray(); track col) {
                    <th class="table-th"><div class="h-3 bg-gray-200 rounded w-16"></div></th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of rowsArray(); track row) {
                  <tr class="table-row">
                    @for (col of colsArray(); track col) {
                      <td class="table-td"><div class="h-4 bg-gray-100 rounded w-full max-w-[8rem]"></div></td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }
  `],
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
