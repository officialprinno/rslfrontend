import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  OnInit,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppFooterComponent } from '../../shared/components/app-footer/app-footer.component';
import { LayoutService } from '../../core/services/layout.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, SidebarComponent, NavbarComponent, AppFooterComponent],
  templateUrl: './main-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent implements OnInit {
  readonly layout = inject(LayoutService);

  ngOnInit(): void {
    this.syncBreakpoint();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.syncBreakpoint();
  }

  private syncBreakpoint(): void {
    const width = window.innerWidth;
    if (width < 768) {
      this.layout.closeMobileSidebar();
    } else if (width < 1024) {
      this.layout.setSidebarCollapsed(true);
    } else {
      this.layout.setSidebarCollapsed(false);
    }
  }
}
