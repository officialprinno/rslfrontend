import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  MasterInventorySeedPreview,
  MasterInventorySeedResult,
} from '../../../core/models/inventory.model';
import { InventoryService } from '../../../core/services/inventory.service';
import { exportToExcel } from '../../../core/utils/export.util';
import {
  MASTER_INVENTORY_CATEGORIES,
  MASTER_INVENTORY_ITEM_COUNT,
} from '../data/master-inventory.data';

export interface MasterImportResult {
  preview: MasterInventorySeedPreview;
  seeded?: MasterInventorySeedResult;
}

/**
 * Preview and optionally seed the Rock Solutions master inventory catalogue via API.
 */
export function importMasterInventory(
  inventory: InventoryService,
  options: { update?: boolean; seed?: boolean } = {},
): Observable<MasterImportResult> {
  const { update = false, seed = true } = options;

  if (!seed) {
    return inventory.getMasterSeedPreview().pipe(map((preview) => ({ preview })));
  }

  return inventory.seedMasterInventory(update).pipe(
    map((seeded) => ({
      preview: seeded.preview,
      seeded,
    })),
  );
}

/** Export master category reference to Excel for documentation / audits. */
export function exportMasterCatalogReference(): void {
  exportToExcel(
    'rock-solutions-master-inventory-categories',
    [
      { key: 'code', label: 'Category Code' },
      { key: 'name', label: 'Category Name' },
    ],
    MASTER_INVENTORY_CATEGORIES,
  );
}

export function masterCatalogSummary(): string {
  return `${MASTER_INVENTORY_CATEGORIES.length} categories, ${MASTER_INVENTORY_ITEM_COUNT} items (TZS, reorder level 10)`;
}
