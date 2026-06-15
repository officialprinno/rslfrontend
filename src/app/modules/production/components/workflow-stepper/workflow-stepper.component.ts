import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-workflow-stepper',
  template: `
    <div class="flex flex-wrap items-center gap-2 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
      @for (step of steps(); track step; let i = $index; let last = $last) {
        <div class="flex items-center gap-2">
          <span
            class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold"
            [class]="i <= activeIndex() ? 'bg-[#1B3A6B] text-white' : 'bg-gray-200 text-gray-500'"
          >
            {{ i + 1 }}
          </span>
          <span
            class="text-sm font-medium"
            [class]="i <= activeIndex() ? 'text-[#1B3A6B]' : 'text-gray-400'"
          >
            {{ stepLabel(step) }}
          </span>
          @if (!last) {
            <span class="text-gray-300 mx-1">→</span>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowStepperComponent {
  readonly steps = input.required<readonly string[]>();
  readonly activeIndex = input(0);

  stepLabel(step: string): string {
    return step.replace(/_/g, ' ');
  }
}
