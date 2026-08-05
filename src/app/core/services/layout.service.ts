import { Injectable, signal } from '@angular/core';

const COLLAPSED_STORAGE_KEY = 'rsl-sidebar-collapsed';
export const LAYOUT_MOBILE_MAX = 767;
export const LAYOUT_TABLET_MAX = 1023;

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly sidebarCollapsedSignal = signal(this.readPersistedCollapsed());
  private readonly mobileSidebarOpenSignal = signal(false);
  private readonly isMobileSignal = signal(
    typeof window !== 'undefined' ? window.innerWidth <= LAYOUT_MOBILE_MAX : false,
  );

  readonly sidebarCollapsed = this.sidebarCollapsedSignal.asReadonly();
  readonly mobileSidebarOpen = this.mobileSidebarOpenSignal.asReadonly();
  readonly isMobile = this.isMobileSignal.asReadonly();

  /** Desktop/tablet: collapse rail. Mobile: open/close drawer. */
  toggleSidebar(): void {
    if (this.isMobileSignal()) {
      this.toggleMobileSidebar();
      return;
    }
    this.sidebarCollapsedSignal.update((v) => {
      const next = !v;
      this.persistCollapsed(next);
      return next;
    });
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpenSignal.update((v) => !v);
    this.syncBodyScrollLock();
  }

  openMobileSidebar(): void {
    this.mobileSidebarOpenSignal.set(true);
    this.syncBodyScrollLock();
  }

  closeMobileSidebar(): void {
    if (!this.mobileSidebarOpenSignal()) {
      return;
    }
    this.mobileSidebarOpenSignal.set(false);
    this.syncBodyScrollLock();
  }

  setSidebarCollapsed(collapsed: boolean, persist = true): void {
    this.sidebarCollapsedSignal.set(collapsed);
    if (persist) {
      this.persistCollapsed(collapsed);
    }
  }

  /**
   * Keep layout in sync when crossing mobile / tablet / desktop.
   * Only applies defaults when the breakpoint band changes — does not
   * fight an explicit user toggle within the same band.
   */
  syncBreakpoint(width: number, previousWidth: number | null): void {
    const mobile = width <= LAYOUT_MOBILE_MAX;
    const wasMobile = previousWidth == null ? mobile : previousWidth <= LAYOUT_MOBILE_MAX;
    this.isMobileSignal.set(mobile);

    if (mobile) {
      // Entering or staying on phone: never leave the drawer open after a jump from desktop.
      if (!wasMobile || previousWidth == null) {
        this.closeMobileSidebar();
      }
      return;
    }

    // Leaving mobile → ensure drawer is closed.
    if (wasMobile) {
      this.closeMobileSidebar();
    }

    // First paint / hard load only: choose a sensible default by band.
    if (previousWidth == null) {
      if (width <= LAYOUT_TABLET_MAX) {
        this.setSidebarCollapsed(true, false);
      } else {
        const persisted = this.readPersistedCollapsed();
        this.setSidebarCollapsed(persisted, false);
      }
    }
  }

  private syncBodyScrollLock(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.body.classList.toggle('sidebar-mobile-open', this.mobileSidebarOpenSignal());
  }

  private readPersistedCollapsed(): boolean {
    try {
      return localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private persistCollapsed(collapsed: boolean): void {
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }
}
