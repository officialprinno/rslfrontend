import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  template: `
    <div class="inline-flex items-center gap-0.5" [class.cursor-pointer]="editable()">
      @for (star of stars; track star) {
        <button
          type="button"
          class="text-lg leading-none transition-colors"
          [class]="star <= value() ? 'text-amber-400' : 'text-gray-300'"
          [disabled]="!editable()"
          (click)="editable() && rate.emit(star)"
        >
          ★
        </button>
      }
      @if (showValue()) {
        <span class="ml-1 text-sm text-gray-500">({{ value() }}/5)</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarRatingComponent {
  readonly value = input(0);
  readonly editable = input(false);
  readonly showValue = input(false);
  readonly rate = output<number>();
  readonly stars = [1, 2, 3, 4, 5];
}
