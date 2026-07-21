import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';

import { DepartmentFilter } from '../../../core/models/auth.models';
import { CurrencyCode } from '../../../core/models/preferences.models';
import { CompanyScope, CompanyContextService } from '../../../core/services/company-context.service';
import { WorkspaceResetService } from '../../../core/services/workspace-reset.service';
import { AuthService } from '../../../core/services/auth.service';
import { DepartmentContextService } from '../../../core/services/department-context.service';
import { LayoutService } from '../../../core/services/layout.service';
import { NotificationCountsService } from '../../../core/services/notification-counts.service';
import { NotificationShellService } from '../../../core/services/notification-shell.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { LocaleThemeControlsComponent } from '../locale-theme-controls/locale-theme-controls.component';

interface Breadcrumb {
  labelKey: string;
  url: string | null;
}

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, TranslatePipe, LocaleThemeControlsComponent],
  templateUrl: './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly companyContext = inject(CompanyContextService);
  readonly deptContext = inject(DepartmentContextService);
  readonly layout = inject(LayoutService);
  readonly preferences = inject(PreferencesService);
  readonly counts = inject(NotificationCountsService);
  readonly notificationShell = inject(NotificationShellService);
  private readonly workspaceReset = inject(WorkspaceResetService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly userMenuOpen = signal(false);
  readonly deptMenuOpen = signal(false);
  readonly companyMenuOpen = signal(false);
  readonly breadcrumbs = signal<Breadcrumb[]>([{ labelKey: 'nav.dashboard', url: '/dashboard' }]);

  readonly departmentOptions = computed(() => {
    const options: { value: DepartmentFilter; labelKey: string }[] = [
      { value: 'all', labelKey: 'common.all_departments' },
    ];
    const user = this.auth.getCurrentUser();
    for (const dept of user?.departments ?? []) {
      const key = dept.department_name.toLowerCase() as DepartmentFilter;
      if (['procurement', 'sales', 'logistics'].includes(key)) {
        options.push({ value: key, labelKey: `nav.${key}.title` });
      }
    }
    if (this.auth.hasModuleAccess('inventory')) {
      options.push({ value: 'inventory', labelKey: 'nav.inventory.title' });
    }
    return options;
  });

  constructor() {
    this.updateBreadcrumbs(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateBreadcrumbs(e.urlAfterRedirects));
    this.translate.onLangChange.subscribe(() => this.updateBreadcrumbs(this.router.url));
  }

  toggleSidebar(): void {
    if (window.innerWidth < 768) {
      this.layout.toggleMobileSidebar();
    } else {
      this.layout.toggleSidebar();
    }
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
    this.deptMenuOpen.set(false);
    this.companyMenuOpen.set(false);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  toggleDeptMenu(): void {
    this.deptMenuOpen.update((v) => !v);
    this.userMenuOpen.set(false);
    this.companyMenuOpen.set(false);
  }

  closeDeptMenu(): void {
    this.deptMenuOpen.set(false);
  }

  selectDepartment(value: DepartmentFilter): void {
    this.deptContext.setDepartment(value);
    this.closeDeptMenu();
  }

  toggleCompanyMenu(): void {
    this.companyMenuOpen.update((v) => !v);
    this.userMenuOpen.set(false);
    this.deptMenuOpen.set(false);
  }

  closeCompanyMenu(): void {
    this.companyMenuOpen.set(false);
  }

  selectCompany(companyId: CompanyScope): void {
    if (companyId === 'consolidated' && !this.companyContext.canUseConsolidated()) {
      return;
    }
    this.workspaceReset.resetForCompanySwitch();
    this.companyContext.setCompany(companyId);
    this.companyContext.confirmWorkspaceSelection();
    this.closeCompanyMenu();
    void this.router.navigate(['/dashboard']);
  }

  onCurrencyChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as CurrencyCode;
    this.preferences.setCurrency(value);
  }

  logout(): void {
    this.closeUserMenu();
    this.auth.logout();
  }

  userInitials(): string {
    const user = this.auth.getCurrentUser();
    if (!user) return '?';
    return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
  }

  private updateBreadcrumbs(url: string): void {
    const segments = url.split('/').filter(Boolean);
    const crumbs: Breadcrumb[] = [];
    let path = '';

    const labels: Record<string, string> = {
      dashboard: 'nav.dashboard',
      inventory: 'nav.inventory.title',
      procurement: 'nav.procurement.title',
      sales: 'nav.sales.title',
      logistics: 'nav.logistics.title',
      production: 'nav.production.title',
      finance: 'nav.finance.title',
      hr: 'nav.hr.title',
      safety: 'nav.safety.title',
      messaging: 'nav.messaging',
      email: 'nav.email',
      settings: 'nav.settings',
    };

    for (const seg of segments) {
      path += `/${seg}`;
      crumbs.push({ labelKey: labels[seg] ?? seg, url: path });
    }

    const activeCompany = this.companyContext.activeCompany();
    if (activeCompany && crumbs.length > 0) {
      crumbs.unshift({
        labelKey: activeCompany.code,
        url: null,
      });
    }

    if (crumbs.length === 0) {
      crumbs.push({ labelKey: 'nav.dashboard', url: '/dashboard' });
    }

    this.breadcrumbs.set(crumbs);
  }
}
