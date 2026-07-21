import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Shell for enterprise list tables — sticky header, in-card scroll, page stays still. */
@Component({
  selector: 'app-enterprise-data-table',
  template: `
    <div class="card card--scroll-body enterprise-data-table-card">
      <div class="enterprise-card-accent" aria-hidden="true"></div>

      @if (cardTitle() || cardSubtitle() || showCount()) {
        <div class="card-scroll-head enterprise-card-head">
          <div class="enterprise-card-head__main">
            @if (cardTitle()) {
              <h3 class="card-scroll-title">{{ cardTitle() }}</h3>
            }
            @if (cardSubtitle()) {
              <p class="enterprise-card-subtitle">{{ cardSubtitle() }}</p>
            }
          </div>
          @if (showCount()) {
            <span class="enterprise-card-count">{{ recordCount() }} {{ recordCount() === 1 ? 'record' : 'records' }}</span>
          }
        </div>
      }

      <ng-content select="[cardToolbar]" />

      <div class="card-scroll-host">
        <div class="table-container enterprise-table-container" [class.table-container--wide]="wide()">
          <div class="table-scroll-viewport enterprise-table-viewport">
            <table class="enterprise-table w-full">
              <ng-content />
            </table>
          </div>
          <div class="enterprise-table-footer">
            <ng-content select="[tableFooter]" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
      min-height: 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnterpriseDataTableComponent {
  /** In-card title — stays fixed while rows scroll. */
  readonly cardTitle = input<string | undefined>(undefined);

  /** Optional one-line description under the title. */
  readonly cardSubtitle = input<string | undefined>(undefined);

  /** Total row count shown as a badge in the header. */
  readonly recordCount = input<number | undefined>(undefined);

  /** Use on wide tables (10+ columns) so horizontal scroll activates reliably. */
  readonly wide = input(false);

  showCount(): boolean {
    const n = this.recordCount();
    return n !== undefined && n !== null;
  }
}
