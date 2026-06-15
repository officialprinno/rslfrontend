import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ChecklistItem, SafetyInspection } from '../../../../core/models/safety.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { SafetyService } from '../../../../core/services/safety.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatDateTime } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SafetyNavComponent } from '../../components/safety-nav/safety-nav.component';
import {
  INSPECTION_TYPE_COLORS,
  RESULT_COLORS,
  inspectionTypeLabel,
} from '../../constants/safety.constants';

interface SectionGroup {
  section: string;
  items: ChecklistItem[];
}

@Component({
  selector: 'app-inspection-conduct',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SafetyNavComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './inspection-conduct.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionConductComponent implements OnInit {
  private readonly safety = inject(SafetyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);

  readonly inspection = signal<SafetyInspection | null>(null);
  readonly items = signal<ChecklistItem[]>([]);
  readonly remarks = signal<Record<number, string>>({});
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly savingId = signal<number | null>(null);
  readonly completing = signal(false);
  readonly inspectorNotes = signal('');

  readonly formatDateTime = formatDateTime;
  readonly inspectionTypeLabel = inspectionTypeLabel;
  readonly typeColor = (t: string) => INSPECTION_TYPE_COLORS[t as keyof typeof INSPECTION_TYPE_COLORS] ?? 'badge-gray';
  readonly resultColor = (r: string | null) => RESULT_COLORS[r ?? 'PENDING'] ?? 'badge-gray';

  readonly isReadOnly = computed(() => this.inspection()?.status === 'COMPLETED');

  readonly checkedCount = computed(() =>
    this.items().filter((i) => i.result !== null).length,
  );

  readonly progressPercent = computed(() => {
    const total = this.items().length;
    if (!total) return 0;
    return Math.round((this.checkedCount() / total) * 100);
  });

  readonly sectionGroups = computed((): SectionGroup[] => {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of this.items()) {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    }
    return Array.from(map.entries()).map(([section, sectionItems]) => ({
      section,
      items: sectionItems,
    }));
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set(true);
      return;
    }
    this.load(id);
  }

  load(id: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.safety
      .getInspection(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (insp) => {
          this.inspection.set(insp);
          this.items.set(insp.checklist_items ?? []);
          this.inspectorNotes.set(insp.notes ?? '');
          const remarksMap: Record<number, string> = {};
          for (const item of insp.checklist_items ?? []) {
            if (item.remarks) remarksMap[item.id] = item.remarks;
          }
          this.remarks.set(remarksMap);
        },
        error: () => this.error.set(true),
      });
  }

  getRemarks(itemId: number): string {
    return this.remarks()[itemId] ?? '';
  }

  setRemarks(itemId: number, value: string): void {
    this.remarks.update((m) => ({ ...m, [itemId]: value }));
  }

  setResult(item: ChecklistItem, result: 'PASS' | 'FAIL' | 'NA'): void {
    if (this.isReadOnly()) return;
    this.saveItem(item, result);
  }

  saveItem(item: ChecklistItem, result?: 'PASS' | 'FAIL' | 'NA'): void {
    const insp = this.inspection();
    if (!insp || this.isReadOnly()) return;

    const resolvedResult = result ?? item.result;
    if (!resolvedResult) return;

    const remarkText = this.getRemarks(item.id).trim();
    if (resolvedResult === 'FAIL' && !remarkText) {
      this.notification.error('Remarks are required when marking an item as FAIL.');
      return;
    }

    this.savingId.set(item.id);
    this.safety
      .updateChecklistItem(insp.id, item.id, {
        result: resolvedResult,
        remarks: resolvedResult === 'FAIL' ? remarkText : remarkText || '',
      })
      .pipe(finalize(() => this.savingId.set(null)))
      .subscribe({
        next: (updated) => {
          this.items.update((list) =>
            list.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)),
          );
          if (insp.status === 'SCHEDULED') {
            this.inspection.update((i) => (i ? { ...i, status: 'IN_PROGRESS' } : i));
          }
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }

  goBack(): void {
    this.router.navigate(['/safety/inspections']);
  }

  completeInspection(): void {
    const insp = this.inspection();
    if (!insp || this.isReadOnly()) return;

    const unchecked = this.items().filter((i) => !i.result);
    if (unchecked.length) {
      this.notification.error(`${unchecked.length} checklist item(s) still unchecked.`);
      return;
    }

    const failedWithoutRemarks = this.items().filter(
      (i) => i.result === 'FAIL' && !this.getRemarks(i.id).trim() && !i.remarks?.trim(),
    );
    if (failedWithoutRemarks.length) {
      this.notification.error('All failed items must have remarks.');
      return;
    }

    this.completing.set(true);
    this.safety
      .completeInspection(insp.id, this.inspectorNotes())
      .pipe(finalize(() => this.completing.set(false)))
      .subscribe({
        next: (updated) => {
          this.notification.success('Inspection completed');
          this.inspection.set(updated);
          this.items.set(updated.checklist_items ?? []);
          this.router.navigate(['/safety/inspections']);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e)),
      });
  }
}
