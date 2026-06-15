import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { Item } from '../../../../core/models/inventory.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { formatCurrency, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';

@Component({
  selector: 'app-manufacturing',
  imports: [
    RouterLink,
    PageHeaderComponent,
    InventoryNavComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  templateUrl: './manufacturing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManufacturingComponent implements OnInit {
  private readonly inventory = inject(InventoryService);

  readonly rawMaterials = signal<Item[]>([]);
  readonly wip = signal<Item[]>([]);
  readonly finishedGoods = signal<Item[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly formatNumber = formatNumber;
  readonly formatCurrency = formatCurrency;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      raw: this.inventory.getItems({ item_type: 'RAW_MATERIAL', page_size: 100, is_active: true }),
      wip: this.inventory.getItems({ item_type: 'WORK_IN_PROGRESS', page_size: 100, is_active: true }),
      finished: this.inventory.getItems({ item_type: 'FINISHED_GOODS', page_size: 100, is_active: true }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ raw, wip, finished }) => {
          this.rawMaterials.set(raw.results);
          this.wip.set(wip.results);
          this.finishedGoods.set(finished.results);
        },
        error: () => this.error.set(true),
      });
  }
}
