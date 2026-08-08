import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppFooterComponent } from '../../shared/components/app-footer/app-footer.component';
import { ActivityTrackerService } from '../../core/services/activity-tracker.service';
import { DisplayCurrencyService } from '../../core/services/display-currency.service';
import { LayoutService } from '../../core/services/layout.service';
import { NotificationShellService } from '../../core/services/notification-shell.service';
import { ChatWidgetComponent } from '../../shared/components/chat-widget/chat-widget.component';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { NotificationsPanelComponent } from '../../shared/components/notifications-panel/notifications-panel.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    SidebarComponent,
    NavbarComponent,
    NotificationsPanelComponent,
    AppFooterComponent,
    ChatWidgetComponent,
  ],
  providers: [NotificationShellService],
  templateUrl: './main-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  readonly layout = inject(LayoutService);
  readonly notificationShell = inject(NotificationShellService);
  private readonly displayCurrency = inject(DisplayCurrencyService);
  private readonly activityTracker = inject(ActivityTrackerService);

  private lastWidth: number | null = null;

  ngOnInit(): void {
    this.syncBreakpoint();
    this.notificationShell.start();
    this.activityTracker.start();
    this.displayCurrency.syncFromPreferences();
    this.displayCurrency.refreshRates();
  }

  ngOnDestroy(): void {
    this.notificationShell.stop();
    this.activityTracker.stop();
    this.layout.closeMobileSidebar();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.syncBreakpoint();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.layout.closeMobileSidebar();
  }

  private syncBreakpoint(): void {
    const width = window.innerWidth;
    this.layout.syncBreakpoint(width, this.lastWidth);
    this.lastWidth = width;
  }
}
