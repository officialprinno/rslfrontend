import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly sidebarCollapsedSignal = signal(false);
  private readonly mobileSidebarOpenSignal = signal(false);

  readonly sidebarCollapsed = this.sidebarCollapsedSignal.asReadonly();
  readonly mobileSidebarOpen = this.mobileSidebarOpenSignal.asReadonly();

  toggleSidebar(): void {
    this.sidebarCollapsedSignal.update((v) => !v);
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpenSignal.update((v) => !v);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpenSignal.set(false);
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsedSignal.set(collapsed);
  }
}
