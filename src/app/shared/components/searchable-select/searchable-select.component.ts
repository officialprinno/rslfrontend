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

export interface SelectOption {
  value: number | string;
  label: string;
  sublabel?: string;
}

@Component({
  selector: 'app-searchable-select',
  imports: [FormsModule],
  template: `
    <div class="relative" #container>
      <input
        type="text"
        class="input-field"
        [class.input-field--error]="hasError()"
        [placeholder]="placeholder()"
        [value]="displayValue()"
        (input)="onSearch($event)"
        (focus)="openDropdown.set(true)"
        [disabled]="disabled()"
      />
      @if (openDropdown()) {
        <ul
          class="absolute z-[60] mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1"
        >
          @if (filteredOptions().length) {
            @for (opt of filteredOptions(); track opt.value) {
              <li>
                <button
                  type="button"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                  (click)="selectOption(opt)"
                >
                  <span class="font-medium text-gray-900">{{ opt.label }}</span>
                  @if (opt.sublabel) {
                    <span class="block text-xs text-gray-400">{{ opt.sublabel }}</span>
                  }
                </button>
              </li>
            }
          } @else {
            <li class="px-3 py-2 text-sm text-gray-500">No options available</li>
          }
        </ul>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchableSelectComponent {
  readonly options = input<SelectOption[]>([]);
  readonly value = input<number | string | null>(null);
  readonly placeholder = input('Search...');
  readonly disabled = input(false);
  readonly hasError = input(false);

  readonly valueChange = output<number | string | null>();

  readonly openDropdown = signal(false);
  readonly searchTerm = signal('');

  private readonly containerRef = viewChild<ElementRef<HTMLElement>>('container');

  filteredOptions(): SelectOption[] {
    const term = this.searchTerm().toLowerCase();
    const opts = this.options();
    if (!term) return opts.slice(0, 20);
    return opts
      .filter(
        (o) =>
          o.label.toLowerCase().includes(term) ||
          o.sublabel?.toLowerCase().includes(term),
      )
      .slice(0, 20);
  }

  displayValue(): string {
    if (this.openDropdown()) return this.searchTerm();
    const selected = this.options().find((o) => o.value == this.value());
    return selected?.label ?? this.searchTerm();
  }

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    this.openDropdown.set(true);
  }

  selectOption(opt: SelectOption): void {
    this.searchTerm.set(opt.label);
    this.valueChange.emit(opt.value);
    this.openDropdown.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const el = this.containerRef()?.nativeElement;
    if (el && !el.contains(event.target as Node)) {
      this.openDropdown.set(false);
    }
  }
}
