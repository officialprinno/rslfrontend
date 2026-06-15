import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { AppFooterComponent } from '../../../../shared/components/app-footer/app-footer.component';

@Component({
  selector: 'app-unauthorized',
  imports: [RouterLink, AppFooterComponent],
  template: `
    <div class="app-shell app-shell--standalone">
      <div class="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-6">
        <div class="login-card max-w-md w-full text-center">
        <div
          class="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-2xl font-bold bg-gradient-to-br from-[#F0A500] to-[#D4920A] text-[#1B3A6B] shadow-lg"
        >
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 class="page-title mb-2">Access Denied</h1>
        <p class="text-sm text-gray-500 mb-8 leading-relaxed">
          You do not have permission to view this page. Contact your administrator if you
          believe this is an error.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <a [routerLink]="homeRoute()" class="btn-primary">Go to Home</a>
          <button type="button" (click)="logout()" class="btn-secondary">Sign out</button>
        </div>
      </div>
      <app-app-footer />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnauthorizedComponent {
  private readonly auth = inject(AuthService);

  homeRoute(): string {
    return this.auth.getDefaultHomeRoute();
  }

  logout(): void {
    this.auth.logout();
  }
}
