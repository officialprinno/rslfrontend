import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface LocationTab {
  id: number | null;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-location-tabs',
  imports: [],
  template: `
    <div class="location-tabs">
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          class="location-tab"
          [class.active]="selected() === tab.id"
          (click)="selectedChange.emit(tab.id)"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationTabsComponent {
  readonly tabs = input<LocationTab[]>([
    { id: null, label: 'All Locations', icon: '🌐' },
  ]);
  readonly selected = input<number | null>(null);
  readonly selectedChange = output<number | null>();
}
