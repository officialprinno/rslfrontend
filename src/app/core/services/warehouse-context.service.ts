import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'rsl_active_warehouse';

@Injectable({ providedIn: 'root' })
export class WarehouseContextService {
  readonly activeWarehouseId = signal<number | null>(this.load());

  setWarehouse(id: number | null): void {
    this.activeWarehouseId.set(id);
    try {
      if (id === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, String(id));
      }
    } catch {
      /* ignore */
    }
  }

  private load(): number | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const id = Number(raw);
        return Number.isFinite(id) ? id : null;
      }
    } catch {
      /* ignore */
    }
    return null;
  }
}
