import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';

@Component({
  selector: 'app-module-shell',
  imports: [PageHeaderComponent, EmptyStateComponent],
  template: `
    <div class="page-container">
      <app-page-header [title]="title" [subtitle]="subtitle" [hasActions]="false" [showDate]="true" />
      <div class="card !p-0 overflow-hidden">
        <div class="h-1 bg-gradient-to-r from-[#1B3A6B] via-[#2E86AB] to-[#F0A500]"></div>
        <app-empty-state
          [title]="title + ' Module'"
          [message]="'This module is under development. Full UI will be available in a future release.'"
          icon="folder"
        />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleShellComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = (this.route.snapshot.data['title'] as string) ?? 'Module';
  readonly subtitle = (this.route.snapshot.data['subtitle'] as string) ?? '';
}
