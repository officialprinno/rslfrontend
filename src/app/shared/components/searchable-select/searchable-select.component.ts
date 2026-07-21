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
  name?: string;
  code?: string;
  sublabel?: string;
}

/** @deprecated Prefer SelectCategoryGroup for chart-of-accounts pickers. */
export interface SelectOptionGroup {
  id: string;
  category: string;
  subcategory: string;
  options: SelectOption[];
  tone?: 'ready' | 'pending';
}

export interface SelectSubcategoryGroup {
  id: string;
  label: string | null;
  options: SelectOption[];
}

export interface SelectCategoryGroup {
  id: string;
  label: string;
  subcategories: SelectSubcategoryGroup[];
}

@Component({
  selector: 'app-searchable-select',
  imports: [FormsModule],
  template: `
    <div class="relative" #container>
      <div class="relative">
        <span
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clip-rule="evenodd"
            />
          </svg>
        </span>
        <input
          type="text"
          class="input-field !pl-9 !pr-9"
          [class.input-field--error]="hasError()"
          [class.ring-2]="openDropdown()"
          [class.ring-[#1B3A6B]/20]="openDropdown()"
          [class.border-[#1B3A6B]]="openDropdown()"
          [placeholder]="placeholder()"
          [value]="displayValue()"
          (input)="onSearch($event)"
          (focus)="open()"
          [disabled]="disabled()"
        />
        <span
          class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-transform"
          [class.rotate-180]="openDropdown()"
          aria-hidden="true"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
              clip-rule="evenodd"
            />
          </svg>
        </span>
      </div>

      @if (openDropdown()) {
        <div
          class="absolute z-[60] mt-1.5 w-full min-w-[min(100%,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          [style.width]="wideDropdown() ? 'min(36rem, calc(100vw - 2rem))' : null"
        >
          @if (useCategoryGroups()) {
            @if (filteredCategoryGroups().length) {
              @if (searchTerm().trim()) {
                <div class="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                  {{ visibleAccountCount() }} account{{ visibleAccountCount() === 1 ? '' : 's' }} found
                </div>
              }
              <ul class="overflow-y-auto py-1" [style.max-height]="dropdownMaxHeight()">
                @for (category of filteredCategoryGroups(); track category.id) {
                  <li>
                    <div
                      class="sticky top-0 z-[2] border-b border-slate-100 bg-slate-50/95 px-3 py-2 backdrop-blur-sm"
                    >
                      <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-[#1B3A6B]">
                        {{ category.label }}
                      </p>
                    </div>
                    @for (sub of category.subcategories; track sub.id) {
                      @if (sub.label) {
                        <div class="px-4 pt-2 pb-1 text-[11px] font-semibold text-slate-500">
                          {{ sub.label }}
                        </div>
                      }
                      @for (opt of sub.options; track opt.value) {
                        <button
                          type="button"
                          class="group flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors"
                          [class.bg-blue-50]="isSelected(opt)"
                          [class.hover:bg-slate-50]="!isSelected(opt)"
                          (click)="selectOption(opt)"
                        >
                          <span
                            class="min-w-0 flex-1 truncate text-sm"
                            [class.font-semibold]="isSelected(opt)"
                            [class.text-[#1B3A6B]]="isSelected(opt)"
                            [class.text-slate-800]="!isSelected(opt)"
                          >
                            {{ opt.name || opt.label }}
                          </span>
                          @if (opt.code) {
                            <span
                              class="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] tabular-nums text-slate-600 group-hover:bg-white"
                            >
                              {{ opt.code }}
                            </span>
                          }
                        </button>
                      }
                    }
                  </li>
                }
              </ul>
            } @else {
              <div class="px-4 py-6 text-center text-sm text-slate-500">No matching accounts</div>
            }
          } @else if (useGroups()) {
            @if (filteredGroups().length) {
              <ul class="overflow-y-auto py-1" [style.max-height]="dropdownMaxHeight()">
                @for (group of filteredGroups(); track group.id) {
                  <li>
                    <div
                      class="sticky top-0 z-[2] border-b px-3 py-2 backdrop-blur-sm"
                      [class.bg-emerald-50]="group.tone === 'ready'"
                      [class.border-emerald-200]="group.tone === 'ready'"
                      [class.bg-amber-50]="group.tone === 'pending'"
                      [class.border-amber-200]="group.tone === 'pending'"
                      [class.bg-slate-50]="!group.tone"
                      [class.border-slate-100]="!group.tone"
                    >
                      <p
                        class="text-[11px] font-bold uppercase tracking-[0.08em]"
                        [class.text-emerald-800]="group.tone === 'ready'"
                        [class.text-amber-900]="group.tone === 'pending'"
                        [class.text-[#1B3A6B]]="!group.tone"
                      >
                        {{ group.category }}
                      </p>
                      @if (group.subcategory) {
                        <p class="mt-0.5 text-[11px] font-medium text-slate-500">{{ group.subcategory }}</p>
                      }
                    </div>
                    @for (opt of group.options; track opt.value) {
                      <button
                        type="button"
                        class="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                        (click)="selectOption(opt)"
                      >
                        <span
                          class="font-medium text-slate-900"
                          [class.truncate]="!wideDropdown()"
                          [class.whitespace-normal]="wideDropdown()"
                          [class.break-words]="wideDropdown()"
                        >
                          {{ opt.label }}
                        </span>
                        @if (opt.sublabel) {
                          <span class="text-[11px] leading-4 text-slate-500">{{ opt.sublabel }}</span>
                        }
                      </button>
                    }
                  </li>
                }
              </ul>
            } @else {
              <div class="px-4 py-6 text-center text-sm text-slate-500">No matching accounts</div>
            }
          } @else if (filteredOptions().length) {
            <ul class="overflow-y-auto py-1" [style.max-height]="dropdownMaxHeight()">
              @for (opt of filteredOptions(); track opt.value) {
                <li>
                  <button
                    type="button"
                    class="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                    (click)="selectOption(opt)"
                  >
                    @if (opt.sublabel) {
                      <span class="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        {{ opt.sublabel }}
                      </span>
                    }
                    <span class="font-medium text-slate-900">{{ opt.label }}</span>
                  </button>
                </li>
              }
            </ul>
          } @else {
            <div class="px-4 py-6 text-center text-sm text-slate-500">No options available</div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchableSelectComponent {
  /** Only one dropdown may be open at a time across the app. */
  private static activeInstance: SearchableSelectComponent | null = null;

  readonly options = input<SelectOption[]>([]);
  readonly groups = input<SelectOptionGroup[]>([]);
  readonly categoryGroups = input<SelectCategoryGroup[]>([]);
  readonly value = input<number | string | null>(null);
  readonly placeholder = input('Search...');
  readonly disabled = input(false);
  readonly hasError = input(false);
  readonly maxVisible = input(25);
  readonly dropdownMaxHeight = input('16rem');
  readonly wideDropdown = input(false);

  readonly valueChange = output<number | string | null>();

  readonly openDropdown = signal(false);
  readonly searchTerm = signal('');

  private readonly containerRef = viewChild<ElementRef<HTMLElement>>('container');

  useCategoryGroups(): boolean {
    return this.categoryGroups().length > 0;
  }

  useGroups(): boolean {
    return !this.useCategoryGroups() && this.groups().length > 0;
  }

  allFlatOptions(): SelectOption[] {
    if (this.useCategoryGroups()) {
      return this.categoryGroups().flatMap((category) =>
        category.subcategories.flatMap((sub) => sub.options),
      );
    }
    if (this.useGroups()) {
      return this.groups().flatMap((group) => group.options);
    }
    return this.options();
  }

  filteredOptions(): SelectOption[] {
    const term = this.searchTerm().toLowerCase().trim();
    const opts = this.options();
    if (!term) return opts.slice(0, this.maxVisible());
    return opts
      .filter(
        (o) =>
          o.label.toLowerCase().includes(term) ||
          o.sublabel?.toLowerCase().includes(term) ||
          o.code?.toLowerCase().includes(term) ||
          o.name?.toLowerCase().includes(term),
      )
      .slice(0, this.maxVisible());
  }

  filteredGroups(): SelectOptionGroup[] {
    const term = this.searchTerm().toLowerCase().trim();
    const source = this.groups();
    if (!term) return source;

    return source
      .map((group) => {
        const headerMatch =
          group.category.toLowerCase().includes(term) ||
          group.subcategory.toLowerCase().includes(term);
        const matchedOptions = group.options.filter((o) => this.optionMatchesTerm(o, term));
        if (headerMatch) return group;
        if (matchedOptions.length) return { ...group, options: matchedOptions };
        return null;
      })
      .filter((group): group is SelectOptionGroup => group !== null);
  }

  filteredCategoryGroups(): SelectCategoryGroup[] {
    const term = this.searchTerm().toLowerCase().trim();
    const source = this.categoryGroups();
    if (!term) return source;

    return source
      .map((category) => {
        const categoryMatch = category.label.toLowerCase().includes(term);
        const subcategories = category.subcategories
          .map((sub) => {
            const subMatch = sub.label?.toLowerCase().includes(term) ?? false;
            const matchedOptions = sub.options.filter((o) => this.optionMatchesTerm(o, term));
            if (categoryMatch || subMatch) return sub;
            if (matchedOptions.length) return { ...sub, options: matchedOptions };
            return null;
          })
          .filter((sub): sub is SelectSubcategoryGroup => sub !== null);

        if (subcategories.length) return { ...category, subcategories };
        return null;
      })
      .filter((category): category is SelectCategoryGroup => category !== null);
  }

  visibleAccountCount(): number {
    return this.filteredCategoryGroups().reduce(
      (total, category) =>
        total + category.subcategories.reduce((subTotal, sub) => subTotal + sub.options.length, 0),
      0,
    );
  }

  isSelected(opt: SelectOption): boolean {
    return opt.value == this.value();
  }

  displayValue(): string {
    if (this.openDropdown()) return this.searchTerm();
    const selected = this.allFlatOptions().find((o) => o.value == this.value());
    if (!selected) return this.searchTerm();
    if (selected.name && selected.code) return `${selected.name} · ${selected.code}`;
    return selected.label;
  }

  open(): void {
    if (this.disabled()) return;
    const current = SearchableSelectComponent.activeInstance;
    if (current && current !== this) {
      current.close();
    }
    SearchableSelectComponent.activeInstance = this;
    this.openDropdown.set(true);
  }

  close(): void {
    this.openDropdown.set(false);
    this.searchTerm.set('');
    if (SearchableSelectComponent.activeInstance === this) {
      SearchableSelectComponent.activeInstance = null;
    }
  }

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    this.open();
  }

  selectOption(opt: SelectOption): void {
    this.valueChange.emit(opt.value);
    this.close();
  }

  // pointerdown instead of click: modal containers stopPropagation() on click,
  // which would otherwise prevent outside-click detection inside modals.
  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: Event): void {
    if (!this.openDropdown()) return;
    const el = this.containerRef()?.nativeElement;
    if (el && !el.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.openDropdown()) {
      this.close();
    }
  }

  private optionMatchesTerm(opt: SelectOption, term: string): boolean {
    return (
      opt.label.toLowerCase().includes(term) ||
      (opt.name?.toLowerCase().includes(term) ?? false) ||
      (opt.code?.toLowerCase().includes(term) ?? false) ||
      (opt.sublabel?.toLowerCase().includes(term) ?? false)
    );
  }
}
