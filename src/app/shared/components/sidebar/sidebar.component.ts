import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslatePipe } from '@ngx-translate/core';

import { NAV_ITEMS, NAV_SECTION_LABELS } from '../../../core/config/navigation.config';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { ROLES } from '../../../core/constants/roles.constants';
import { NavChildItem, NavIcon, NavItem, NavSection } from '../../../core/models/navigation.models';
import { AuthService } from '../../../core/services/auth.service';
import { isMachineOperatorOnly } from '../../../core/utils/operator-access.util';
import { LayoutService } from '../../../core/services/layout.service';
import { NotificationCountsService } from '../../../core/services/notification-counts.service';

const OPERATOR_PRODUCTION_ROUTES = new Set([
  '/production/operator',
  '/production/work-orders',
  '/production/machines',
]);

const MANAGER_PRODUCTION_ROUTES = new Set([
  '/production/dashboard',
  '/production/products',
  '/production/bom',
  '/production/output',
  '/production/machine-usage',
  '/production/reports',
]);

const EXPANDED_STORAGE_KEY = 'rsl-sidebar-expanded-groups';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, HasPermissionDirective, NgTemplateOutlet, TranslatePipe],
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly collapsed = input(false);
  readonly mobileOpen = input(false);
  readonly navItemClick = output<void>();

  readonly auth = inject(AuthService);
  readonly layout = inject(LayoutService);
  readonly counts = inject(NotificationCountsService);
  private readonly router = inject(Router);

  readonly navItems = NAV_ITEMS;
  readonly sectionLabels = NAV_SECTION_LABELS;
  readonly currentUrl = signal(this.router.url);
  readonly expandedGroups = signal<Set<string>>(this.loadExpandedGroups());

  private visibleItem(item: NavItem): boolean {
    if (item.route === '/dashboard') {
      return this.auth.canAccessMainDashboard();
    }
    if (item.route === '/production/dashboard' && this.isMachineOperatorOnly()) {
      return this.auth.hasModuleAccess('production');
    }
    if (item.module === 'safety' && this.auth.hasRole(ROLES.STOREKEEPER)) {
      return false;
    }
    if (item.module === 'inventory' && this.isMachineOperatorOnly()) {
      return false;
    }
    if (!item.module) {
      return true;
    }
    return this.auth.hasModuleAccess(item.module);
  }

  private visibleChild(child: NavChildItem): boolean {
    if (child.module === 'safety' && this.auth.hasRole(ROLES.STOREKEEPER)) {
      return false;
    }
    if (child.module === 'production') {
      if (this.isMachineOperatorOnly()) {
        return OPERATOR_PRODUCTION_ROUTES.has(child.route);
      }
      if (MANAGER_PRODUCTION_ROUTES.has(child.route)) {
        return true;
      }
      return child.route === '/production/work-orders' || child.route === '/production/machines';
    }
    return this.auth.hasModuleAccess(child.module);
  }

  private isMachineOperatorOnly(): boolean {
    const user = this.auth.getCurrentUser();
    if (!user) {
      return false;
    }
    const roleNames: string[] = [];
    for (const d of user.departments ?? []) {
      const name = d.role_name || d.role;
      if (name) {
        roleNames.push(name);
      }
    }
    if (user.role_name && !roleNames.includes(user.role_name)) {
      roleNames.push(user.role_name);
    }
    return isMachineOperatorOnly(roleNames);
  }

  readonly mainItems = computed(() => NAV_ITEMS.filter((i) => i.section === 'main' && this.visibleItem(i)));
  readonly moduleItems = computed(() =>
    NAV_ITEMS.filter((i) => i.section === 'modules' && this.visibleItem(i)).map((item) => {
      if (item.route === '/production/dashboard' && this.isMachineOperatorOnly()) {
        return {
          ...item,
          route: '/production/operator',
          label: 'Production',
          children: item.children?.filter((c) => this.visibleChild(c)),
        };
      }
      return item.children?.length
        ? { ...item, children: item.children.filter((c) => this.visibleChild(c)) }
        : item;
    }),
  );
  readonly systemItems = computed(() => NAV_ITEMS.filter((i) => i.section === 'system' && this.visibleItem(i)));

  constructor() {
    this.autoExpandForUrl(this.router.url);

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        this.currentUrl.set(e.urlAfterRedirects);
        this.autoExpandForUrl(e.urlAfterRedirects);
      });

    effect(() => {
      this.persistExpandedGroups(this.expandedGroups());
    });
  }

  onNavClick(): void {
    this.navItemClick.emit();
    this.layout.closeMobileSidebar();
  }

  logout(): void {
    this.auth.logout();
  }

  userInitials(): string {
    const user = this.auth.getCurrentUser();
    if (!user) return '?';
    return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
  }

  badgeCount(item: NavItem | NavChildItem): number {
    if (!item.badgeKey) return 0;
    return this.counts.badgeFor(item.badgeKey);
  }

  sectionLabel(section: NavSection): string | null {
    if (section === 'main') return null;
    return this.sectionLabels[section];
  }

  isExpanded(route: string): boolean {
    return this.expandedGroups().has(route);
  }

  toggleGroup(route: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.expandedGroups.update((set) => {
      const next = new Set(set);
      if (next.has(route)) {
        next.delete(route);
      } else {
        next.add(route);
      }
      return next;
    });
  }

  isGroupActive(item: NavItem): boolean {
    const url = this.currentUrl();
    if (url.startsWith(item.route)) return true;
    return item.children?.some((c) => url.startsWith(c.route)) ?? false;
  }

  isChildActive(route: string): boolean {
    const url = this.currentUrl();
    return url === route || url.startsWith(route + '/');
  }

  groupKey(item: NavItem): string {
    return item.route;
  }

  private autoExpandForUrl(url: string): void {
    for (const item of NAV_ITEMS) {
      if (!item.children?.length) continue;
      const match =
        url.startsWith(item.route) ||
        item.children.some((c) => url === c.route || url.startsWith(c.route + '/'));
      if (match) {
        this.expandedGroups.update((set) => {
          if (set.has(item.route)) return set;
          const next = new Set(set);
          next.add(item.route);
          return next;
        });
        break;
      }
    }
  }

  private loadExpandedGroups(): Set<string> {
    try {
      const raw = localStorage.getItem(EXPANDED_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        return new Set(parsed);
      }
    } catch {
      /* ignore */
    }
    return new Set<string>();
  }

  private persistExpandedGroups(set: Set<string>): void {
    try {
      localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...set]));
    } catch {
      /* ignore */
    }
  }

  iconPath(icon: NavIcon): string {
    const paths: Record<NavIcon, string> = {
      dashboard:
        'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      inventory:
        'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      procurement:
        'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      sales:
        'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      logistics:
        'M8 17h8M8 17v-4m8 4v-4m-8 0h8M3 9h18l-2 8H5L3 9zm2-4h14l1 4H4l1-4z',
      driver:
        'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      production:
        'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
      finance:
        'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      hr: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
      safety:
        'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      messages:
        'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      email:
        'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      settings:
        'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    };
    return paths[icon];
  }
}
