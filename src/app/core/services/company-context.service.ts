import { Injectable, computed, inject, signal } from '@angular/core';

import { UserCompanyAssignment } from '../models/auth.models';
import { DashboardCacheService } from '../../shared/dashboard/services/dashboard-cache.service';
import { PreferencesService } from './preferences.service';

const STORAGE_KEY = 'rsl_active_company';
const REMEMBER_KEY = 'rsl_remember_company';

/** Finance and GM only — explicit consolidated workspace. */
const CONSOLIDATED_ROLES = new Set([
  'Super Admin',
  'General Manager',
  'HOD Finance',
  'Internal Auditor',
]);

export type CompanyScope = number | 'consolidated';

export interface ActiveCompanyState {
  id: CompanyScope;
  code: string;
  name: string;
  brandColor: string;
}

@Injectable({ providedIn: 'root' })
export class CompanyContextService {
  private readonly preferences = inject(PreferencesService);
  private readonly dashboardCache = inject(DashboardCacheService);

  private readonly companiesSignal = signal<UserCompanyAssignment[]>([]);
  private readonly roleNamesSignal = signal<string[]>([]);
  private readonly selectionRequiredSignal = signal(false);

  readonly companies = this.companiesSignal.asReadonly();
  readonly selectionRequired = this.selectionRequiredSignal.asReadonly();

  readonly activeCompany = signal<ActiveCompanyState | null>(this.loadFromStorage());

  readonly isConsolidated = computed(() => this.activeCompany()?.id === 'consolidated');

  readonly canUseConsolidated = computed(() =>
    this.roleNamesSignal().some((role) => CONSOLIDATED_ROLES.has(role)),
  );

  initializeFromUser(
    userCompanies: UserCompanyAssignment[] | undefined,
    primaryCompanyId?: number | null,
    roleNames?: string[],
  ): void {
    this.roleNamesSignal.set(roleNames ?? []);

    const companies = userCompanies ?? [];
    this.companiesSignal.set(companies);

    if (companies.length === 0) {
      this.activeCompany.set(null);
      this.selectionRequiredSignal.set(false);
      return;
    }

    if (companies.length === 1) {
      this.setCompany(companies[0].company_id, false);
      this.selectionRequiredSignal.set(false);
      return;
    }

    const remembered = this.shouldRemember() ? this.loadFromStorage() : null;
    if (remembered && this.isAccessible(remembered.id, companies)) {
      const current = this.activeCompany();
      if (current?.id !== remembered.id) {
        this.activeCompany.set(remembered);
      }
      this.syncDashboardScope();
      this.selectionRequiredSignal.set(false);
      return;
    }

    this.activeCompany.set(null);
    this.selectionRequiredSignal.set(true);
  }

  setCompany(companyId: CompanyScope, remember = true): void {
    if (companyId === 'consolidated') {
      if (!this.canUseConsolidated()) {
        return;
      }
      const current = this.activeCompany();
      if (current?.id === 'consolidated') {
        this.selectionRequiredSignal.set(false);
        this.syncDashboardScope();
        return;
      }
      const state: ActiveCompanyState = {
        id: 'consolidated',
        code: 'ALL',
        name: 'Consolidated',
        brandColor: '#1B3A6B',
      };
      this.activeCompany.set(state);
      this.persist(state, remember);
      this.selectionRequiredSignal.set(false);
      this.syncDashboardScope();
      return;
    }

    const company = this.companiesSignal().find((c) => c.company_id === companyId);
    if (!company) {
      return;
    }

    const current = this.activeCompany();
    if (current?.id === companyId) {
      this.selectionRequiredSignal.set(false);
      this.syncDashboardScope();
      if (remember) {
        this.preferences.saveDefaultCompany(company.company_id);
      }
      return;
    }

    const state: ActiveCompanyState = {
      id: company.company_id,
      code: company.company_code,
      name: company.company_name,
      brandColor: company.brand_color || '#1B3A6B',
    };
    this.activeCompany.set(state);
    this.persist(state, remember);
    this.selectionRequiredSignal.set(false);
    this.syncDashboardScope();

    if (remember) {
      this.preferences.saveDefaultCompany(company.company_id);
    }
  }

  confirmWorkspaceSelection(): void {
    this.selectionRequiredSignal.set(false);
  }

  setRememberSelection(remember: boolean): void {
    try {
      localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  shouldRemember(): boolean {
    try {
      return localStorage.getItem(REMEMBER_KEY) !== '0';
    } catch {
      return true;
    }
  }

  headerValue(): string | null {
    const active = this.activeCompany();
    if (!active) return null;
    if (active.id === 'consolidated') return 'consolidated';
    return String(active.id);
  }

  label(): string {
    return this.activeCompany()?.name ?? 'Select Company';
  }

  clear(): void {
    this.activeCompany.set(null);
    this.companiesSignal.set([]);
    this.roleNamesSignal.set([]);
    this.selectionRequiredSignal.set(false);
    this.dashboardCache.setCompanyScope('none');
    this.dashboardCache.invalidate();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  isMultiCompany(): boolean {
    return this.companiesSignal().length > 1;
  }

  private isAccessible(id: CompanyScope, companies: UserCompanyAssignment[]): boolean {
    if (id === 'consolidated') return this.canUseConsolidated();
    return companies.some((c) => c.company_id === id);
  }

  private persist(state: ActiveCompanyState, remember: boolean): void {
    if (!remember) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }

  private loadFromStorage(): ActiveCompanyState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ActiveCompanyState;
      if (!parsed || typeof parsed.id === 'undefined' || !parsed.code || !parsed.name) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private syncDashboardScope(): void {
    this.dashboardCache.setCompanyScope(this.headerValue() ?? 'none');
  }
}
