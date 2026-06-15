import { Injectable, signal } from '@angular/core';

import { DepartmentFilter } from '../models/auth.models';

const STORAGE_KEY = 'rsl_active_department';

@Injectable({ providedIn: 'root' })
export class DepartmentContextService {
  readonly activeDepartment = signal<DepartmentFilter>(this.load());

  setDepartment(value: DepartmentFilter): void {
    this.activeDepartment.set(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }

  label(): string {
    const map: Record<DepartmentFilter, string> = {
      all: 'All Departments',
      procurement: 'Procurement',
      sales: 'Sales',
      logistics: 'Logistics',
      inventory: 'Inventory',
    };
    return map[this.activeDepartment()];
  }

  private load(): DepartmentFilter {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) as DepartmentFilter | null;
      if (raw && ['all', 'procurement', 'sales', 'logistics', 'inventory'].includes(raw)) {
        return raw;
      }
    } catch {
      /* ignore */
    }
    return 'all';
  }
}
