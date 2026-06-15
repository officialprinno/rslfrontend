import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface MultiSelectOption {
  value: number;
  label: string;
  sublabel?: string;
}

@Component({
  selector: 'app-multi-select',
  imports: [FormsModule],
  template: `
    <div class="relative" #container>
      <div
        class="input-field min-h-[42px] flex flex-wrap gap-1 items-center cursor-text"
        (click)="open.set(true)"
      >
        @if (!selected().length) {
          <span class="text-gray-400 text-sm">{{ placeholder() }}</span>
        }
        @for (id of selected(); track id) {
          <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1B3A6B]/10 text-[#1B3A6B] rounded-lg text-xs font-medium">
            {{ labelFor(id) }}
            <button type="button" class="hover:text-red-600" (click)="toggle(id); $event.stopPropagation()">×</button>
          </span>
        }
      </div>
      @if (open() && filtered().length) {
        <ul class="absolute z-[60] mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1">
          @for (opt of filtered(); track opt.value) {
            <li>
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                [class.bg-blue-50]="isSelected(opt.value)"
                (click)="toggle(opt.value)"
              >
                <span class="font-medium">{{ opt.label }}</span>
                @if (opt.sublabel) {
                  <span class="block text-xs text-gray-400">{{ opt.sublabel }}</span>
                }
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiSelectComponent {
  readonly options = input<MultiSelectOption[]>([]);
  readonly selected = input<number[]>([]);
  readonly placeholder = input('Select...');
  readonly selectionChange = output<number[]>();

  readonly open = signal(false);
  readonly search = signal('');
  private readonly containerRef = viewChild<ElementRef<HTMLElement>>('container');

  filtered(): MultiSelectOption[] {
    const term = this.search().toLowerCase();
    const opts = this.options();
    if (!term) return opts;
    return opts.filter((o) => o.label.toLowerCase().includes(term));
  }

  labelFor(id: number): string {
    return this.options().find((o) => o.value === id)?.label ?? String(id);
  }

  isSelected(id: number): boolean {
    return this.selected().includes(id);
  }

  toggle(id: number): void {
    const current = [...this.selected()];
    const idx = current.indexOf(id);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(id);
    this.selectionChange.emit(current);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const el = this.containerRef()?.nativeElement;
    if (el && !el.contains(e.target as Node)) this.open.set(false);
  }
}
